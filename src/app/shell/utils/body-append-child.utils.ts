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
        childToAppend = wrapWithStyleData(newChild, getParentStyleData(newChild))
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
  }
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
  while (!(currentNode.dataset['styleIsolation'] === '') && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}

function wrapWithStyleData(element: HTMLElement, styleData: StyleData) {
  const dataStyleWrapper = createDataStyleWrapper(styleData)

  dataStyleWrapper.appendChild(element)
  observeWrapper(dataStyleWrapper)
  return dataStyleWrapper
}

function createDataStyleWrapper(styleData: StyleData) {
  const wrapper = document.createElement('div')
  wrapper.dataset['styleIsolation'] = ''

  if (styleData.styleId) {
    wrapper.dataset['styleId'] = styleData.styleId
  }
  if (styleData.noPortalLayoutStyles || styleData.noPortalLayoutStyles === '') {
    wrapper.dataset['noPortalLayoutStyles'] = styleData.noPortalLayoutStyles
  }

  return wrapper
}

function getParentStyleData(child: HTMLElement): StyleData {
  const parent = findParentStyleElement(child)

  return {
    styleId: parent.dataset['styleId'],
    noPortalLayoutStyles: parent.dataset['noPortalLayoutStyles']
  }
}

function findParentStyleElement(startNode: HTMLElement): HTMLElement {
  let currentNode = startNode
  while (!currentNode.dataset['styleId'] && currentNode.parentElement) {
    currentNode = currentNode.parentElement
  }
  return currentNode
}
