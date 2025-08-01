import { POLYFILL_SCOPE_MODE } from '@onecx/angular-integration-interface'
import { isCssScopeRuleSupported } from '@onecx/angular-utils'
import { createNodeList, updateStyleSheets } from 'src/scope-polyfill/polyfill'
import {
  findStyleDataWrapper,
  getStyleDataOrIntermediateStyleData,
  removeStyleDataRecursive,
  wrapWithStyleData
} from './style-data.utils'
import { getOnecxTriggerElement } from './onecx-trigger-element.utils'

export function ensureBodyChangesIncludeStyleData(polyfillMode: string | undefined) {
  overwriteAppendChild(polyfillMode)
  overwriteRemoveChild()
}

// When appending children to body create a wrapper with style isolation data and recompute style sheets for browsers not supporting @scope rule so all added elements are styled correctly immediately on the page
function overwriteAppendChild(polyfillMode: string | undefined) {
  const originalAppendChild = document.body.appendChild
  document.body.appendChild = function (newChild: any): any {
    let childToAppend = newChild
    if (newChild.nodeType === Node.ELEMENT_NODE) {
      const onecxTriggerElement = getOnecxTriggerElement()
      const styleData =
        (getStyleDataOrIntermediateStyleData(newChild) ?? onecxTriggerElement)
          ? getStyleDataOrIntermediateStyleData(onecxTriggerElement)
          : null
      if (styleData) {
        childToAppend = wrapWithStyleData(newChild, styleData)
        removeStyleDataRecursive(newChild)
      }
    }
    const result = originalAppendChild.call(this, childToAppend)
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
}

// When removing children from the body make sure to remove the wrapper with style isolation data
function overwriteRemoveChild() {
  const originalRemoveChild = document.body.removeChild
  document.body.removeChild = function (child: any): any {
    let childToRemove = child
    if (child.nodeType === Node.ELEMENT_NODE) {
      childToRemove = findStyleDataWrapper(child)
    }
    return originalRemoveChild.call(this, childToRemove)
  }
}
