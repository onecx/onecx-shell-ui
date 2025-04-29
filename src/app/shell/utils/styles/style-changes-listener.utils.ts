import { dataStyleIdKey, replacePrimengPrefix } from '@onecx/angular-utils'

/**
 * Registers a listener that utilizes MutationObserver to validate styles added to the document head.
 *
 * Whenever new style element, containing Angular component styles, is added to head of the document, this initializer is going to replace PrimeNg prefix of all CSS variables with the scopeId of the application.
 *
 * The listener assumes that the style element containing the "_nghost" attribute is Angular component style.
 *
 * The listener finds the scopeId data by looking for "_nghost" owner and looking for the closest styleId element.
 */
export function styleChangesListenerInitializer() {
  return async () => {
    const observer = new MutationObserver((mutationList: MutationRecord[]) =>
      updateAngularComponentsStyles(mutationList)
    )
    observer.observe(document.head, {
      childList: true
    })
  }
}

function updateAngularComponentsStyles(mutationList: MutationRecord[]) {
  const newComponentStyleMutations = mutationList.filter((record) =>
    doesContainAngularComponentStyle(record.addedNodes)
  )

  const newComponentStyleNodes = newComponentStyleMutations
    .flatMap((mutation) => Array.from(mutation.addedNodes))
    .filter((node) => isAngularComponentStyle(node))

  newComponentStyleNodes.forEach((node) => {
    if (!node.textContent) {
      return
    }

    const scopeId = getScopeIdFromNodeContent(node.textContent)
    if (!scopeId) {
      return
    }

    node.textContent = replacePrimengPrefix(node.textContent, scopeId)
  })
}

function doesContainAngularComponentStyle(nodeList: NodeList): boolean {
  return Array.from(nodeList).filter((node) => isAngularComponentStyle(node)).length > 0
}

function isAngularComponentStyle(node: Node): boolean {
  return node.textContent?.includes('[_nghost') ?? false
}

function getScopeIdFromNodeContent(nodeContent: string): string | null {
  const ngHostAttribute = getNgHostAttributeFromNodeContent(nodeContent)
  if (!ngHostAttribute) return null

  const ngHostElement = getElementWithNgHostAttribute(ngHostAttribute)
  if (!ngHostElement) return null

  return getScopeIdForElement(ngHostElement)
}

function getNgHostAttributeFromNodeContent(css: string): string | null {
  const ngHostAttributeRegex = /_nghost-([^\]]*)/
  const ngHostAttributeMatch = css.match(ngHostAttributeRegex)
  if (ngHostAttributeMatch) {
    return ngHostAttributeMatch[0]
  }

  return null
}

function getElementWithNgHostAttribute(ngHostAttribute: string): HTMLElement | null {
  return document.querySelector(`[${ngHostAttribute}]`)
}

function getScopeIdForElement(element: HTMLElement): string | null {
  let currentElement: HTMLElement | null = element
  while (currentElement) {
    if (currentElement.dataset[dataStyleIdKey]) return currentElement.dataset[dataStyleIdKey]
    currentElement = currentElement.parentElement
  }
  return null
}
