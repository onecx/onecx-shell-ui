import { CssStyleSheetHandler } from './css-style-sheet-updater'
import { OcxCSSStyleSheet, OcxOwnerNode, ScopeSelectorPresenceMap, SelectorPresenceMap } from './data'
import {
  dataStyleIdKey,
  containsSupportsRule,
  isScopedStyleSheet,
  mutationListToUniqueNodes,
  nodeToStyleIdSelectors,
  normalize
} from './utils'

const scopedSheetNodes = new Set()

/**
 * Apply the scope polyfill. The polyfill updates all scoped style sheets on a page based on the observed changes to the body of the document. Any change in body of the document and its children related to attributes and the whole tree will cause the update.
 *
 * The polyfill assumes that:
 * - single style sheet is related to a single scope
 * - style sheet scoping is expressed by using the supports css rule wrapping scope supports rule, e.g., "@supports (@scope([data-style-id="shell-ui"]) to ([data-style-isolation]))"
 */
export function applyScopePolyfill() {
  if (typeof CSSScopeRule === 'undefined') {
    const observer = new MutationObserver((mutationList: MutationRecord[]) => updateStyleSheets(mutationList))
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true
    })
  }
}

/**
 * Ensures that all scoped style sheets are updated by the polyfill on the following events:
 * - HTMLElement.appendChild call
 * - HTMLElement.className call
 * - HTMLElement.classList's method calls
 *
 * This function overrides mentioned functionalities of all HTMLElement constructed on a page by overriding the HTMLElement.prototype
 */
export function overrideHtmlElementAppendAndClassChanges() {
  if (typeof CSSScopeRule === 'undefined') {
    overrideHtmlElementAppend()
    overrideHtmlElementClassChanges()
  }
}

/**
 * Creates an object compatible with NodeList interface based on the provided nodes.
 */
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
  } as any as NodeList
}

/**
 * Updates scoped style sheets. Scope style sheet is a style sheet that was already transformed by this polyfill that implements OcxCSSStyleSheet interface.
 *
 * This function will transform new style sheets containing supports css rule to a style sheet that is understandable by all browsers that do not support the scope css rule. After that operation, the style sheet will be considered updated if necessary.
 *
 * Based on the provided mutations this function will select a subset of scoped style sheets that require an update.
 *
 * An update for a style sheet consists of:
 * - Finding the HTML sections affected by the scope of the style sheet
 * - Updates css rules so each css style rule (e.g., ".custom-class { background-color: 'blue' }") has updated css selector with a path to all usages of the rule with the usage of the :where and :nth-child css selectors (e.g., ".custom-class:where(:nth-child(1) > :nth-child(2)) { background-color: 'blue' }"). Presented example means: apply "background-color: 'blue'" style to an HTMLElement that has "class='custom-class'" and is the second child of the first child of the root element.
 */
export function updateStyleSheets(mutationList: MutationRecord[]) {
  const nodesFromMutationList = mutationListToUniqueNodes(mutationList)
  if (nodesFromMutationList.length === 0) return

  const styleElements = document.styleSheets
  // Find what scope needs to be updated so no unnecessary updates are made
  const distinctStyleIdSelectors = getChangedStyleIdSelectors(mutationList)
  const scopeSelectorsCache: ScopeSelectorPresenceMap = new Map<string, Map<string, boolean>>()
  for (const sheet of Array.from(styleElements)) {
    if (containsSupportsRule(sheet)) {
      CssStyleSheetHandler.changeToScopedSheet(sheet)
      setupStyleNodeObserver(sheet as OcxCSSStyleSheet)
    }
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

function overrideHtmlElementAppend() {
  const originalAppend = HTMLElement.prototype.appendChild
  HTMLElement.prototype.appendChild = function (newChild: any): any {
    const result = originalAppend.call(this, newChild)
    updateStyleSheets([
      {
        type: 'childList',
        target: this,
        addedNodes: createNodeList([newChild]),
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null,
        removedNodes: createNodeList([])
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
      updateStyleSheetsForClassChange(this)
      return result
    }
  })

  const originalClassListGetter = (HTMLElement.prototype as any).__lookupGetter__('classList')

  Object.defineProperty(HTMLElement.prototype, 'classList', {
    get: function () {
      const classList = originalClassListGetter.call(this)
      classList.ocxHtmlElement = this
      return classList
    },
    configurable: true
  })

  const domTokenListOriginalAdd = DOMTokenList.prototype.add

  DOMTokenList.prototype.add = function (...tokens: string[]) {
    const result = domTokenListOriginalAdd.call(this, ...tokens)
    const element = (this as any).ocxHtmlElement
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }

  const domTokenListOriginalRemove = DOMTokenList.prototype.remove

  DOMTokenList.prototype.remove = function (...tokens: string[]) {
    const result = domTokenListOriginalRemove.call(this, ...tokens)
    const element = (this as any).ocxHtmlElement
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }

  const domTokenListOriginalReplace = DOMTokenList.prototype.replace

  DOMTokenList.prototype.replace = function (token: string, newToken: string) {
    const result = domTokenListOriginalReplace.call(this, token, newToken)
    const element = (this as any).ocxHtmlElement
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }

  const domTokenListOriginalToggle = DOMTokenList.prototype.toggle

  DOMTokenList.prototype.toggle = function (token: string, force: boolean | undefined) {
    const result = domTokenListOriginalToggle.call(this, token, force)
    const element = (this as any).ocxHtmlElement
    if (element) updateStyleSheetsForClassChange(element)
    return result
  }
}

function updateStyleSheetsForClassChange(element: Node) {
  updateStyleSheets([
    {
      type: 'attributes',
      target: element,
      addedNodes: createNodeList([]),
      attributeName: 'class',
      attributeNamespace: null,
      nextSibling: null,
      oldValue: null,
      previousSibling: null,
      removedNodes: createNodeList([])
    } as MutationRecord
  ])
}

/**
 * Returns if selector is in list of changed selector list
 */
function isSelectorInChangedList(selector: string, changedStyleIdSelectorList: Array<string>) {
  return changedStyleIdSelectorList.some((styleIdSelector) => normalize(styleIdSelector) === normalize(selector))
}

/**
 * Find what scope that need to be updated based on the mutationList
 */
function getChangedStyleIdSelectors(mutationList: MutationRecord[]) {
  const set = new Set<string>()
  for (const mutation of mutationList) {
    // If mutation was made to the body, we assume that its addition or removal of the wrapper
    if (mutation.target === document.body) {
      const styleIdSelectors = getChangedStyleIdSelectorForWrapper(mutation)
      styleIdSelectors && styleIdSelectors.forEach((selector) => set.add(selector))
      continue
    }

    // Find closest element with scope data
    let currentNode: HTMLElement | null = mutation.target as HTMLElement
    while (currentNode && isNotChildOfBodyAndHasNoStyleId(currentNode)) {
      currentNode = currentNode.parentElement
    }
    if (!currentNode) continue
    const styleIdSelectors = nodeToStyleIdSelectors(currentNode)
    styleIdSelectors && styleIdSelectors.forEach((selector) => set.add(selector))
  }

  return Array.from(set)
}

/**
 * Find style id for body change based on added and removed nodes
 */
function getChangedStyleIdSelectorForWrapper(record: MutationRecord) {
  const node = (record.addedNodes.item(0) ?? record.removedNodes.item(0)) as HTMLElement
  if (!node) return null

  return nodeToStyleIdSelectors(node)
}

function isNotChildOfBodyAndHasNoStyleId(node: Node) {
  return node.parentElement !== document.body && !(node as any)?.dataset[dataStyleIdKey]
}

/**
 * Create observer for style sheet node updates
 */
function setupStyleNodeObserver(sheet: OcxCSSStyleSheet) {
  const sheetNode = sheet.ownerNode
  if (sheetNode && !scopedSheetNodes.has(sheetNode)) {
    scopedSheetNodes.add(sheetNode)
    // Create an observer for the new style sheet
    const sheetObserver = new MutationObserver(() => existingScopedSheetCallback(sheetNode))
    sheetObserver.observe(sheetNode, {
      characterData: true,
      childList: true,
      subtree: true
    })
  }
}

/**
 * Executes update of the style sheet
 */
function executeManualUpdateOfStyleSheet(
  sheet: OcxCSSStyleSheet,
  mutatedElements: Element[],
  selectorCache: SelectorPresenceMap,
  skipMutationCheck = false
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

/**
 * Callback method to fire for existing style sheet content changes
 */
function existingScopedSheetCallback(element: OcxOwnerNode) {
  const cssStyleSheet = element.sheet as OcxCSSStyleSheet
  if (!cssStyleSheet) return

  updateScopedStyleForExistingSheet(cssStyleSheet)
}

/**
 * Handles update for a change in style sheet content
 */
function updateScopedStyleForExistingSheet(sheet: OcxCSSStyleSheet) {
  if (containsSupportsRule(sheet)) {
    CssStyleSheetHandler.changeToScopedSheet(sheet)
  }

  if (isScopedStyleSheet(sheet)) {
    executeManualUpdateOfStyleSheet(sheet, [], new Map(), true)
  }
}
