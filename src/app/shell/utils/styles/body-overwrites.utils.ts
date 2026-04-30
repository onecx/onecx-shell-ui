import { POLYFILL_SCOPE_MODE } from '@onecx/angular-integration-interface'
import { isCssScopeRuleSupported } from '@onecx/angular-utils'
import { createNodeList, updateStyleSheets } from 'src/scope-polyfill/polyfill'
import {
  findStyleDataWrapper,
  getStyleDataOrIntermediateStyleData,
  markElement,
  removeStyleDataRecursive,
  wrapWithDiv
} from './style-data.utils'
import { getOnecxTriggerElement } from './onecx-trigger-element.utils'

type blackListCondition = (newChild: Node) => boolean
type blackListCallback = (newChild: Node) => void
type blackListItem = {
  condition: blackListCondition
  callback?: blackListCallback
}

const blackListConditions: blackListItem[] = [
  {
    condition: (newChild: Node) =>
      newChild.nodeType === Node.ELEMENT_NODE &&
      newChild instanceof HTMLElement &&
      newChild.classList.contains('cdk-overlay-container'),
    callback: (newChild: Node) => {
      overwriteAngularMaterialOverlayContainer(newChild)
    }
  },
  {
    condition: (newChild: Node) =>
      newChild.nodeType === Node.ELEMENT_NODE &&
      newChild instanceof HTMLElement &&
      newChild.classList.contains('cdk-visually-hidden')
  }
]

export function ensureBodyChangesIncludeStyleData(polyfillMode: string | undefined) {
  overwriteBodyAppendChild(polyfillMode)
  overwriteBodyRemoveChild()
}

// When appending children to body create a wrapper with style isolation data and recompute style sheets for browsers not supporting @scope rule so all added elements are styled correctly immediately on the page
function overwriteBodyAppendChild(polyfillMode: string | undefined) {
  const originalAppendChild = document.body.appendChild
  document.body.appendChild = function (newChild: Node): any {
    // if new child matches any black list condition then do not wrap it, only run callback if required
    const blackListItem = blackListConditions.find((item) => item.condition(newChild))
    if (blackListItem) {
      blackListItem.callback?.(newChild)
      return originalAppendChild.call(this, newChild)
    }

    // wrap new child with style data coming from child elements or from trigger element if available
    // this ensures globally added elements to body are styled correctly according to the origin they come from
    return wrapWithStyleData(this, newChild, originalAppendChild, polyfillMode)
  }
}

// When removing children from the body make sure to remove the wrapper with style isolation data
function overwriteBodyRemoveChild() {
  return overwriteRemoveChild(document.body)
}

function overwriteRemoveChild(el: Node) {
  const originalRemoveChild = el.removeChild
  el.removeChild = function (child: Node): any {
    let childToRemove = child
    if (child.nodeType === Node.ELEMENT_NODE && child instanceof HTMLElement) {
      childToRemove = findStyleDataWrapper(child) ?? child
    }
    return originalRemoveChild.call(this, childToRemove)
  }
}

function wrapWithStyleData(
  el: Node,
  newChild: Node,
  originalAppendChild: (newChild: Node) => any,
  polyfillMode: string | undefined
) {
  let childToAppend = newChild

  markElement(newChild, 'overwriteAppendChild')
  if (newChild.nodeType === Node.ELEMENT_NODE && newChild instanceof HTMLElement) {
    const onecxTriggerElement = getOnecxTriggerElement()
    const triggerElementStyleData = onecxTriggerElement
      ? getStyleDataOrIntermediateStyleData(onecxTriggerElement)
      : null
    const childElementStyleData = getStyleDataOrIntermediateStyleData(newChild)
    const styleData = childElementStyleData ?? triggerElementStyleData ?? undefined
    childToAppend = wrapWithDiv(newChild, styleData)
    removeStyleDataRecursive(newChild)
  }
  const result = originalAppendChild.call(el, childToAppend)
  if (!isCssScopeRuleSupported() && polyfillMode === POLYFILL_SCOPE_MODE.PRECISION) {
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

function overwriteAngularMaterialOverlayContainer(cdkNode: Node) {
  const originalAppendChild = cdkNode.appendChild
  cdkNode.appendChild = function (newChild: Node): any {
    return wrapWithStyleData(this, newChild, originalAppendChild, undefined)
  }

  overwriteRemoveChild(cdkNode)
}
