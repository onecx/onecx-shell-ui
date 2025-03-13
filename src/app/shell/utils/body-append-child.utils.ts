interface StyleData {
  styleId: string | undefined
  noPortalLayoutStyles: string | undefined
}

export function bodyChildListenerInitializer() {
  return async () => {
    const originalAppendChild = document.body.appendChild
    document.body.appendChild = function (newChild: any): any {
      let childToAppend = newChild
      if (newChild.nodeType === Node.ELEMENT_NODE) {
        childToAppend = wrapWithStyleData(newChild, getStyleData(newChild))
        removeStyleDataRecursive(newChild)
      }
      return originalAppendChild.call(this, childToAppend)
    }

    const originalRemoveChild = document.body.removeChild
    document.body.removeChild = function (child: any): any {
      let childToRemove = child
      if (child.nodeType === Node.ELEMENT_NODE) {
        childToRemove = findWrapper(child)
      }
      return originalRemoveChild.call(this, childToRemove)
    }
    ;(document as any).createElementFromPrimeNg = function (args: any): any {
      const el = document.createElement(args['element'])
      const parent = args['this']?.el?.nativeElement
      parent && appendStyleData(el, getStyleData(parent))
      return el
    }
  }
}

function wrapWithStyleData(element: HTMLElement, styleData: StyleData) {
  const dataStyleWrapper = createDataStyleWrapper(styleData)

  dataStyleWrapper.appendChild(element)
  observeWrapper(dataStyleWrapper)
  return dataStyleWrapper
}

function createDataStyleWrapper(styleData: StyleData) {
  const wrapper = document.createElement('div')
  appendStyleData(wrapper, styleData)

  return wrapper
}

function observeWrapper(wrapper: HTMLElement) {
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

function findWrapper(element: HTMLElement) {
  let currentNode = element
  while (currentNode.dataset['styleIsolation'] !== '' && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}

function removeStyleDataRecursive(element: Element) {
  if ((element as HTMLElement).dataset) {
    delete (element as HTMLElement).dataset['styleIsolation']
    delete (element as HTMLElement).dataset['styleId']
    delete (element as HTMLElement).dataset['noPortalLayoutStyles']
  }

  for (const child of Array.from(element.children)) {
    removeStyleDataRecursive(child)
  }
}

function appendStyleData(element: HTMLElement, styleData: StyleData) {
  element.dataset['styleIsolation'] = ''

  if (styleData.styleId) {
    element.dataset['styleId'] = styleData.styleId
  }
  if (styleData.noPortalLayoutStyles || styleData.noPortalLayoutStyles === '') {
    element.dataset['noPortalLayoutStyles'] = styleData.noPortalLayoutStyles
  }
}

function getStyleData(element: HTMLElement): StyleData {
  const styleElement = findStyleElement(element)

  return {
    styleId: styleElement.dataset['styleId'],
    noPortalLayoutStyles: styleElement.dataset['noPortalLayoutStyles']
  }
}

function findStyleElement(startNode: HTMLElement): HTMLElement {
  let currentNode = startNode
  while (!currentNode.dataset['styleId'] && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}
