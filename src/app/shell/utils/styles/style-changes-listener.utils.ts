import { dataNoPortalLayoutStylesKey, dataStyleIdKey, replacePrimengPrefix } from '@onecx/angular-utils'

/**
 * Registers a listener that utilizes MutationObserver to validate styles added to the document head.
 *
 * Whenever new style element, containing Angular component styles, is added to head of the document, this initializer is going to replace PrimeNg prefix of all CSS variables with the scopeId of the application.
 *
 * The listener assumes that the style element containing the "_nghost" attribute is Angular component style.
 *
 * The listener finds the scopeId data by looking for "_nghost" owner and looking for the closest styleId element.
 */
export async function styleChangesListenerInitializer() {
  const observer = new MutationObserver((mutationList: MutationRecord[]) => updateAngularComponentsStyles(mutationList))
  observer.observe(document.head, {
    childList: true
  })
}

function updateAngularComponentsStyles(mutationList: MutationRecord[]) {
  const newComponentStyleNodes = mutationList
    .flatMap((mutation) => Array.from(mutation.addedNodes))
    .filter((node) => isAngularComponentStyle(node))

  newComponentStyleNodes.forEach((node) => {
    if (!node.textContent) {
      return
    }

    const { styleId, noPortalLayoutStyles } = getStyleDataFromNodeContent(node.textContent)
    if (!styleId || !doesStyleDataRequireReplacement(styleId, noPortalLayoutStyles)) {
      return
    }

    node.textContent = replacePrimengPrefix(node.textContent, styleId)
  })
}

function doesStyleDataRequireReplacement(styleId: string | null, noPortalLayoutStyles: string | null | undefined) {
  if (!styleId) return false

  return noPortalLayoutStyles === ''
}

function isAngularComponentStyle(node: Node): boolean {
  return node.textContent?.includes('[_nghost') ?? false
}

function getStyleDataFromNodeContent(nodeContent: string): {
  styleId: string | null
  noPortalLayoutStyles: string | null | undefined
} {
  const ngHostAttribute = getNgHostAttributeFromNodeContent(nodeContent)
  if (!ngHostAttribute)
    return {
      styleId: null,
      noPortalLayoutStyles: null
    }

  const ngHostElement = getElementWithNgHostAttribute(ngHostAttribute)
  if (!ngHostElement)
    return {
      styleId: null,
      noPortalLayoutStyles: null
    }

  return getScopeDataForElement(ngHostElement)
}

function getNgHostAttributeFromNodeContent(css: string): string | null {
  const ngHostAttributeRegex = /_nghost-([^\]]*)/
  const ngHostAttributeMatch = css.match(ngHostAttributeRegex) // NOSONAR
  if (ngHostAttributeMatch) {
    return ngHostAttributeMatch[0]
  }

  return null
}

function getElementWithNgHostAttribute(ngHostAttribute: string): HTMLElement | null {
  return document.querySelector(`[${ngHostAttribute}]`)
}

function getScopeDataForElement(element: HTMLElement): {
  styleId: string | null
  noPortalLayoutStyles: string | null | undefined
} {
  let currentElement: HTMLElement | null = element
  while (currentElement) {
    if (currentElement.dataset[dataStyleIdKey])
      return {
        styleId: currentElement.dataset[dataStyleIdKey],
        noPortalLayoutStyles: currentElement.dataset[dataNoPortalLayoutStylesKey]
      }
    currentElement = currentElement.parentElement
  }
  return {
    styleId: null,
    noPortalLayoutStyles: null
  }
}
