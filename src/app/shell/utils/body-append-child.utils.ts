import { createNodeList, updateStyleSheets } from 'src/scope-polyfill/polyfill'
import {
  dataIntermediateNoPortalLayoutStylesKey,
  dataIntermediateStyleIdKey,
  dataNoPortalLayoutStylesKey,
  dataStyleIdKey,
  dataStyleIsolationKey
} from 'src/scope-polyfill/utils'

interface StyleData {
  styleId: string | undefined
  noPortalLayoutStyles: string | undefined
}

export function bodyChildListenerInitializer() {
  return async () => {
    // When appending children to body create a wrapper with style isolation data and recompute style sheets for browsers not supporting @scope rule so all added elements are styled correctly immediately on the page
    const originalAppendChild = document.body.appendChild
    document.body.appendChild = function (newChild: any): any {
      let childToAppend = newChild
      if (newChild.nodeType === Node.ELEMENT_NODE) {
        childToAppend = wrapWithStyleData(newChild, getStyleDataOrIntermediateStyleData(newChild))
        removeStyleDataRecursive(newChild)
      }
      const result = originalAppendChild.call(this, childToAppend)
      if (typeof CSSScopeRule === 'undefined') {
        updateStyleSheets([
          {
            type: 'childList',
            target: document.body,
            addedNodes: createNodeList([childToAppend]),
            attributeName: null,
            attributeNamespace: null,
            nextSibling: null,
            oldValue: null,
            previousSibling: null,
            removedNodes: createNodeList([])
          } as MutationRecord
        ])
      }
      return result
    }

    // When removing children from the body make sure to remove the wrapper with style isolation data
    const originalRemoveChild = document.body.removeChild
    document.body.removeChild = function (child: any): any {
      let childToRemove = child
      if (child.nodeType === Node.ELEMENT_NODE) {
        childToRemove = findStyleDataWrapper(child)
      }
      return originalRemoveChild.call(this, childToRemove)
    }

    // When creating elements in PrimeNg make sure to include the style id data in them so when appending to the body we don't lose context of the current App
    ;(document as any).createElementFromPrimeNg = function (context: any, tagName: any, options?: any): any {
      const el = document.createElement(tagName, options)
      const parent = context['this']?.el?.nativeElement
      // Append intermediate data so the isolation does not happen by coincidence
      parent && appendIntermediateStyleData(el, getStyleDataOrIntermediateStyleData(parent))
      return el
    }
  }
}

function wrapWithStyleData(element: HTMLElement, styleData: StyleData) {
  const dataStyleWrapper = createDataStyleWrapper(styleData)

  dataStyleWrapper.appendChild(element)
  observeStyleDataWrapper(dataStyleWrapper)
  return dataStyleWrapper
}

function createDataStyleWrapper(styleData: StyleData) {
  const wrapper = document.createElement('div')
  appendStyleData(wrapper, styleData)

  return wrapper
}

// Make sure to remove wrapper if it has no children
function observeStyleDataWrapper(wrapper: HTMLElement) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && wrapper.childNodes.length === 0) {
        wrapper.remove()
        observer.disconnect()
      }
    })
  })

  observer.observe(wrapper, { childList: true })
}

function findStyleDataWrapper(element: HTMLElement) {
  let currentNode = element
  while (currentNode.dataset[dataStyleIsolationKey] !== '' && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}

function removeStyleDataRecursive(element: Element) {
  if ((element as HTMLElement).dataset) {
    delete (element as HTMLElement).dataset[dataStyleIsolationKey]
    delete (element as HTMLElement).dataset[dataStyleIdKey]
    delete (element as HTMLElement).dataset[dataNoPortalLayoutStylesKey]
  }

  for (const child of Array.from(element.children)) {
    removeStyleDataRecursive(child)
  }
}

function appendStyleData(element: HTMLElement, styleData: StyleData) {
  element.dataset[dataStyleIsolationKey] = ''

  if (styleData.styleId) {
    element.dataset[dataStyleIdKey] = styleData.styleId
  }
  if (styleData.noPortalLayoutStyles || styleData.noPortalLayoutStyles === '') {
    element.dataset[dataNoPortalLayoutStylesKey] = styleData.noPortalLayoutStyles
  }
}

function appendIntermediateStyleData(element: HTMLElement, styleData: StyleData) {
  element.dataset[dataIntermediateStyleIdKey] = ''

  if (styleData.styleId) {
    element.dataset[dataIntermediateStyleIdKey] = styleData.styleId
  }
  if (styleData.noPortalLayoutStyles || styleData.noPortalLayoutStyles === '') {
    element.dataset[dataIntermediateNoPortalLayoutStylesKey] = styleData.noPortalLayoutStyles
  }
}

function getStyleDataOrIntermediateStyleData(element: HTMLElement): StyleData {
  const styleElement = findElementWithStyleDataOrIntermediateStyleData(element)

  return {
    styleId: styleElement.dataset[dataStyleIdKey] ?? styleElement.dataset[dataIntermediateStyleIdKey],
    noPortalLayoutStyles:
      styleElement.dataset[dataNoPortalLayoutStylesKey] ?? styleElement.dataset[dataIntermediateNoPortalLayoutStylesKey]
  }
}

function findElementWithStyleDataOrIntermediateStyleData(startNode: HTMLElement): HTMLElement {
  let currentNode = startNode
  while (
    !(currentNode.dataset[dataStyleIdKey] || currentNode.dataset[dataIntermediateStyleIdKey]) &&
    currentNode.parentElement
  ) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}
