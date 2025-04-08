// INFO:
// 3 types of things can happen
// new style appears and needs to be transformed -> should be taken care of
// new elements are on a page that should utilize the scope styles -> should be taken care of
// existing style has updated values -> should be taken care of

import { CssStyleSheetHandler } from './css-style-sheet-updater'
import { OcxCSSStyleSheet, OcxOwnerNode, ScopeSelectorPresenceMap, SelectorPresenceMap } from './scope-data'
import {
  dataStyleIdKey,
  doesContainOnlySupportsRule,
  isScopedStyleSheet,
  mutationListToUniqueNodes,
  nodeToStyleIdSelector,
  normalize
} from './scope-utils'

// Pop ups are nowhere to be found in legacy apps -> resolved
// Pop ups seem to not be styled correctly (look for "menu-style-onecx-tenant|onecx-tenant-ui"):
//Parse information about layers -> RESOLVED

// -- TODO 3.1: Pop ups are not placed correctly in new apps and old apps? (Can be that e.g., keyframes rules are not correctly interpreted) (Are pop ups missplaced in new apps?? -> Help UI seems fine but Tenant UI seems broken)

// Optimize algorithm so re-computation does not happen hat often:
// -- optimized well enough for migrated apps
// -- further optimize solution for legacy apps

// STATUS:
// - children are updated
// - observer for style nodes working
// - on every mutation event (rule selection cache)
// -- create new cache (per scope) of selectors
// -- for every new selector compute if it requires re-computation
// -- if there is no selector for a rule that requires re-computation, don't recompute

// FIXES DONE:
// - target === body
// - don't look for all attributes?

// FIX:
// - optimize further
// - debounce?
// - inputs not styled
// - pop ups in incorrect places
// - media rules not taken

// Possible:
// - improve subSelector caching (more specific, e.g.,
//
// .p-floatlabel
// .p-floatlabel:has(sth)
// ...
//
// )
// - caching the elements choosing for DOM computation

const scopedSheetNodes = new Set()

export function applyScopePolyfill() {
  if (typeof CSSScopeRule === 'undefined') {
    let observer = new MutationObserver((mutationList: MutationRecord[]) => updateStyleSheets(mutationList))
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true
    })
  }
}

export function overrideHtmlElementAppendAndClassChanges() {
  if (typeof CSSScopeRule === 'undefined') {
    overrideHtmlElementAppend()
    overrideHtmlElementClassChanges()
  }
}

function overrideHtmlElementAppend() {
  const originalAppend = HTMLElement.prototype.appendChild
  HTMLElement.prototype.appendChild = function (newChild: any): any {
    const result = originalAppend.call(this, newChild)
    console.log('APPEND SHEET ACTION OVERRIDE')
    updateStyleSheets([
      {
        type: 'childList',
        target: this,
        addedNodes: createNodeList([newChild]) as NodeList,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null,
        removedNodes: createNodeList([]) as NodeList
      } as MutationRecord
    ])
    return result
  }
}

function overrideHtmlElementClassChanges() {
  const originalClassNameSetter = (HTMLElement.prototype as any).__lookupSetter__('className')

  Object.defineProperty(HTMLElement.prototype, 'className', {
    set: function (val) {
      let result
      if (originalClassNameSetter) {
        result = originalClassNameSetter.call(this, val)
      }
      console.log('CLASS NAME')
      updateStyleSheetsForClassChange(this)
      return result
    }
  })

  const originalClassListGetter = (HTMLElement.prototype as any).__lookupGetter__('classList')

  Object.defineProperty(HTMLElement.prototype, 'classList', {
    get: function () {
      const classList = originalClassListGetter.call(this)
      ;(classList as any).ocxHtmlElement = this
      return classList
    },
    configurable: true
  })

  const domTokenListOriginalAdd = DOMTokenList.prototype.add

  DOMTokenList.prototype.add = function (...tokens: string[]) {
    const result = domTokenListOriginalAdd.call(this, ...tokens)
    const element = (this as any).ocxHtmlElement
    console.log('CLASSLIST ADD')
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }

  const domTokenListOriginalRemove = DOMTokenList.prototype.remove

  DOMTokenList.prototype.remove = function (...tokens: string[]) {
    const result = domTokenListOriginalRemove.call(this, ...tokens)
    const element = (this as any).ocxHtmlElement
    console.log('CLASSLIST REMOVE')
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }

  const domTokenListOriginalReplace = DOMTokenList.prototype.replace

  DOMTokenList.prototype.replace = function (token: string, newToken: string) {
    const result = domTokenListOriginalReplace.call(this, token, newToken)
    const element = (this as any).ocxHtmlElement
    console.log('CLASSLIST REPLACE')
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }

  const domTokenListOriginalToggle = DOMTokenList.prototype.toggle

  DOMTokenList.prototype.toggle = function (token: string, force: boolean | undefined) {
    const result = domTokenListOriginalToggle.call(this, token, force)
    const element = (this as any).ocxHtmlElement
    console.log('CLASSLIST TOGGLE')
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }
}

function updateStyleSheetsForClassChange(element: Node) {
  updateStyleSheets([
    {
      type: 'attributes',
      target: element,
      addedNodes: createNodeList([]) as NodeList,
      attributeName: 'class',
      attributeNamespace: null,
      nextSibling: null,
      oldValue: null,
      previousSibling: null,
      removedNodes: createNodeList([]) as NodeList
    } as MutationRecord
  ])
}

export function createNodeList(nodes: Element[]) {
  return {
    nodes: nodes,
    length: nodes.length,
    item: function (index: number) {
      return this.nodes[index]
    },
    forEach: function (callback: any) {
      this.nodes.forEach(callback)
    },
    [Symbol.iterator]: function () {
      let index = 0
      const nodes = this.nodes
      return {
        next: function () {
          if (index < nodes.length) {
            return { value: nodes[index++], done: false }
          } else {
            return { done: true }
          }
        }
      }
    }
  }
}

export function updateStyleSheets(mutationList: MutationRecord[]) {
  const nodesFromMutationList = mutationListToUniqueNodes(mutationList)
  if (nodesFromMutationList.length === 0) return

  const styleElements = document.styleSheets
  const distinctStyleIdSelectors = getChangedStyleIdSelectors(mutationList)
  const scopeSelectorsCache: ScopeSelectorPresenceMap = new Map<string, Map<string, boolean>>()
  for (const sheet of Array.from(styleElements)) {
    // Translate style sheet to OneCX style sheet if it only has supports rule
    if (doesContainOnlySupportsRule(sheet)) {
      CssStyleSheetHandler.changeToScopedSheet(sheet)
      setupStyleNodeObserver(sheet as OcxCSSStyleSheet)
    }
    // If its OneCX style sheet update it
    if (isScopedStyleSheet(sheet)) {
      if (isSelectorInChangedList(sheet.ownerNode.ocxFrom, distinctStyleIdSelectors)) {
        if (!scopeSelectorsCache.has(sheet.ownerNode.ocxMatch)) {
          scopeSelectorsCache.set(sheet.ownerNode.ocxMatch, new Map())
        }
        executeManualUpdateOfStyleSheet(
          sheet,
          nodesFromMutationList,
          scopeSelectorsCache.get(sheet.ownerNode.ocxMatch)!
        )
      }
    }
  }
}

function isSelectorInChangedList(selector: string, changedStyleIdSelectorList: Array<string>) {
  return changedStyleIdSelectorList.some((styleIdSelector) => normalize(styleIdSelector) === normalize(selector))
}

// Find all style id
function getChangedStyleIdSelectors(mutationList: MutationRecord[]) {
  const set = new Set<string>()
  for (const mutation of mutationList) {
    // If mutation was made to the body, we assume that its addition or removal of the wrapper
    if (mutation.target === document.body) {
      const styleIdSelector = getChangedStyleIdSelectorForWrapper(mutation)
      styleIdSelector && set.add(styleIdSelector)
      continue
    }

    let currentNode: HTMLElement | null = mutation.target as HTMLElement
    while (currentNode && isNotChildOfBodyAndHasNoStyleId(currentNode)) {
      currentNode = currentNode.parentElement
    }
    if (!currentNode) continue
    const styleIdSelector = nodeToStyleIdSelector(currentNode)
    styleIdSelector && set.add(styleIdSelector)
  }

  return Array.from(set)
}

// Find style id for body change based on added and removed nodes
function getChangedStyleIdSelectorForWrapper(record: MutationRecord) {
  const node = (record.addedNodes.item(0) ?? record.removedNodes.item(0)) as HTMLElement
  if (!node) return null

  return nodeToStyleIdSelector(node)
}

function isNotChildOfBodyAndHasNoStyleId(node: Node) {
  return node.parentElement !== document.body && !(node as any)?.dataset[dataStyleIdKey]
}

// Create observer for style sheet node updates
function setupStyleNodeObserver(sheet: OcxCSSStyleSheet) {
  const sheetNode = sheet.ownerNode
  if (sheetNode && !scopedSheetNodes.has(sheetNode)) {
    scopedSheetNodes.add(sheetNode)
    // Create an observer for the new style sheet
    let sheetObserver = new MutationObserver(() => existingScopedSheetCallback(sheetNode))
    sheetObserver.observe(sheetNode, {
      characterData: true,
      childList: true,
      subtree: true
    })
  }
}

function executeManualUpdateOfStyleSheet(
  sheet: OcxCSSStyleSheet,
  mutatedElements: Element[],
  selectorCache: SelectorPresenceMap,
  skipMutationCheck: boolean = false
) {
  CssStyleSheetHandler.updateScopedSheet(
    sheet,
    {
      mutatedElements: mutatedElements,
      skipMutationCheck: skipMutationCheck
    },
    selectorCache
  )
}

function existingScopedSheetCallback(element: OcxOwnerNode) {
  const cssStyleSheet = element.sheet as OcxCSSStyleSheet
  if (!cssStyleSheet) return

  updateScopedStyleForExistingSheet(cssStyleSheet)
}

function updateScopedStyleForExistingSheet(sheet: OcxCSSStyleSheet) {
  if (doesContainOnlySupportsRule(sheet)) {
    CssStyleSheetHandler.changeToScopedSheet(sheet)
  }

  if (isScopedStyleSheet(sheet)) {
    executeManualUpdateOfStyleSheet(sheet, [], new Map(), true)
  }
}
