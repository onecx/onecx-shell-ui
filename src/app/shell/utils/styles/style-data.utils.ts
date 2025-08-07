import {
  dataIntermediateMfeElementKey,
  dataIntermediateNoPortalLayoutStylesKey,
  dataIntermediateStyleIdKey,
  dataMfeElementKey,
  dataNoPortalLayoutStylesKey,
  dataStyleIdKey,
  dataStyleIsolationKey
} from '@onecx/angular-utils'

interface StyleData {
  styleId: string | undefined
  noPortalLayoutStyles: string | undefined
  mfeElement: string | undefined
}

/**
 * Wraps an HTMLElement with style data attributes.
 * @param element HTMLElement to wrap with style data
 * @param styleData StyleData object containing style information.
 * @returns A new HTMLElement that wraps the original element with style data attributes.
 */
export function wrapWithStyleData(element: HTMLElement, styleData: StyleData) {
  const dataStyleWrapper = createDataStyleWrapper(styleData)

  dataStyleWrapper.appendChild(element)
  observeStyleDataWrapper(dataStyleWrapper)
  return dataStyleWrapper
}

/**
 * Creates a wrapper element with style data attributes.
 * @param styleData StyleData object containing style information.
 * @returns A new HTMLElement that wraps the style data.
 */
export function createDataStyleWrapper(styleData: StyleData) {
  const wrapper = document.createElement('div')
  appendStyleData(wrapper, styleData)

  return wrapper
}

/**
 * Observes a wrapper element for child changes and removes it if it has no children.
 * @param wrapper HTMLElement to observe for child changes
 * Creates a MutationObserver that listens for childList changes on the wrapper element.
 * If the wrapper has no children after a change, it removes itself and disconnects the observer
 * to prevent further observations.
 */
export function observeStyleDataWrapper(wrapper: HTMLElement) {
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

/**
 * Finds the closest parent element with style data.
 * @param element HTMLElement to search from
 * @returns The closest parent element with style data, or the element itself if it has style data.
 */
export function findStyleDataWrapper(element: HTMLElement): HTMLElement {
  let currentNode = element
  while (currentNode.dataset[dataStyleIsolationKey] !== '' && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}

/**
 * Recursively removes style data from an element and its children.
 * @param element HTMLElement to remove style data from.
 */
export function removeStyleDataRecursive(element: HTMLElement): void {
  if (element.dataset) {
    delete element.dataset[dataStyleIsolationKey]
    delete element.dataset[dataStyleIdKey]
    delete element.dataset[dataNoPortalLayoutStylesKey]
    delete element.dataset[dataMfeElementKey]
  }

  for (const child of Array.from(element.children)) {
    child instanceof HTMLElement && removeStyleDataRecursive(child)
  }
}

/**
 * Appends style data to an element.
 * @param element HTMLElement to append style data to.
 * @param styleData StyleData object containing style information.
 */
export function appendStyleData(element: HTMLElement, styleData: StyleData): void {
  element.dataset[dataStyleIsolationKey] = ''

  if (styleData.styleId) {
    element.dataset[dataStyleIdKey] = styleData.styleId
  }
  if (styleData.noPortalLayoutStyles || styleData.noPortalLayoutStyles === '') {
    element.dataset[dataNoPortalLayoutStylesKey] = styleData.noPortalLayoutStyles
  }
  if (styleData.mfeElement || styleData.mfeElement === '') {
    element.dataset[dataMfeElementKey] = styleData.mfeElement
  }
}

/**
 * Appends intermediate style data to an element.
 * @param element HTMLElement to append style data to.
 * @param styleData StyleData object containing style information.
 */
export function appendIntermediateStyleData(element: HTMLElement, styleData: StyleData): void {
  element.dataset[dataIntermediateStyleIdKey] = ''

  if (styleData.styleId) {
    element.dataset[dataIntermediateStyleIdKey] = styleData.styleId
  }
  if (styleData.noPortalLayoutStyles || styleData.noPortalLayoutStyles === '') {
    element.dataset[dataIntermediateNoPortalLayoutStylesKey] = styleData.noPortalLayoutStyles
  }
  if (styleData.mfeElement || styleData.mfeElement === '') {
    element.dataset[dataIntermediateMfeElementKey] = styleData.mfeElement
  }
}

/**
 * Gets the style data from an element or its intermediate style data if it exists.
 * @param element HTMLElement to get style data from
 * @returns StyleData object or null if no style data is found.
 */
export function getStyleDataOrIntermediateStyleData(element: Node | EventTarget): StyleData | null {
  const styleElement = findElementWithStyleDataOrIntermediateStyleData(element)
  if (!styleElement) return null

  return {
    styleId: styleElement.dataset[dataStyleIdKey] ?? styleElement.dataset[dataIntermediateStyleIdKey],
    noPortalLayoutStyles:
      styleElement.dataset[dataNoPortalLayoutStylesKey] ??
      styleElement.dataset[dataIntermediateNoPortalLayoutStylesKey],
    mfeElement: styleElement.dataset[dataMfeElementKey] ?? styleElement.dataset[dataIntermediateMfeElementKey]
  }
}

/**
 * Finds the closest parent element with style data or intermediate style data.
 * @param startNode Starting node to search from
 * @returns The closest parent element with style data or intermediate style data, or null if not found.
 */
export function findElementWithStyleDataOrIntermediateStyleData(startNode: Node | EventTarget): HTMLElement | null {
  let currentNode = startNode
  const hasStyleData = (node: HTMLElement) => node.dataset[dataStyleIdKey] || node.dataset[dataIntermediateStyleIdKey]
  while (currentNode instanceof HTMLElement && !hasStyleData(currentNode) && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode instanceof HTMLElement && hasStyleData(currentNode) ? currentNode : null
}
