import { CssStyleSheetHandler } from './css-style-sheet-updater'
import { OcxCSSStyleSheet, OcxOwnerNode, ScopeSelectorPresenceMap, SelectorPresenceMap } from './data'
import {
  dataStyleIdKey,
  containsSupportsRule,
  isScopedStyleSheet,
  mutationListToUniqueNodes,
  nodeToStyleIdSelectors,
  normalize,
  findSupportsRule,
  matchScope,
  supportsConditionTextToScopeRuleText
} from './utils'

const scopedSheetNodes = new Set()

/**
 * Applies if PRECISION mode is selected:
 * Scope polyfill is used when browser doesn't support @scope rule. This mode is performance-heavy but precise.
 */
export function applyPrecisionPolyfill() {
  applyScopePolyfill()
  overrideHtmlElementAppendAndClassChanges()
}

/**
 * Apply the scope polyfill.
 * The polyfill updates all scoped style sheets on a page based on the observed changes to the body of the document.
 * Any change in body of the document and its children related to attributes and the whole tree will cause the update.
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
 * Applies if PERFORMANCE mode (default) is selected:
 * Does not use polyfill and allows potential leakage to reduce performance-heavy operations
 * Applies styles on the elements that are defined as "from" section of the @scope rule (e.g., "[data-style-id="shell-ui"][data-no-portal-layout-styles]")
 */
export function applyPerformancePolyfill() {
  if (typeof CSSScopeRule === 'undefined') {
    const observer = new MutationObserver((mutationList: MutationRecord[]) => {
      updateStyleSheetsForPerformanceMode(mutationList)
    })
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      attributes: true
    })
    deconstructExistingStyleSheets()
  }
}

function updateStyleSheetsForPerformanceMode(mutationList: MutationRecord[]) {
  const styleElements = getStyleElementsToCheck(mutationList)
  for (const styleElement of styleElements) {
    deconstructScopeRule(styleElement)
  }
}

function getStyleElementsToCheck(mutationList: MutationRecord[]) {
  const styleElements: HTMLStyleElement[] = []
  for (const mutation of mutationList) {
    const nodesToCheck = [...Array.from(mutation.addedNodes), mutation.target]
    for (const node of nodesToCheck) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'STYLE') {
        styleElements.push(node as HTMLStyleElement)
      }
    }
  }
  return styleElements
}

/**
 * Deletes @supports rule from style sheet and reinserts rules at right position with matched scope as selector
 */
function deconstructScopeRule(styleElement: HTMLStyleElement) {
  if (!styleElement.sheet || !containsSupportsRule(styleElement.sheet)) return

  const supportsRule = findSupportsRule(styleElement.sheet)
  if (!supportsRule) return

  const [match, from] = matchScope(supportsConditionTextToScopeRuleText(supportsRule.conditionText)) ?? []
  if (!match) {
    console.warn('Expected to have a scoped sheet for:', styleElement.sheet)
    return
  }
  if (!(styleElement as any).onecxOriginalCss) {
    return legacyDeconstructScopeRule(styleElement.sheet, supportsRule, from)
  }

  return originalCssBasedDeconstructScopeRule(styleElement, supportsRule, from)
}

/**
 * This function operates on the original css that was used to create the style element.
 * It replaces :root with & and wraps all rules with the selector coming from the @scope rule.
 * The rules that cannot be wrapped (e.g., CSSKeyFramesRule and CSSFontFaceRule) are reinserted as they are on the top of the style sheet.
 *
 * Its important that this function will create a new style sheet and remove the old one. Without that operation some style will not be applied correctly (e.g., border shorthand).
 * @param styleElement - HTMLStyleElement
 * @param supportsRule - CSSSupportsRule that contains the @scope rule
 * @param fromSelector - selector coming from the @scope rule (e.g., [data-style-id="shell-ui"])
 */
function originalCssBasedDeconstructScopeRule(
  styleElement: HTMLStyleElement,
  supportsRule: CSSSupportsRule,
  fromSelector: string
) {
  if (!styleElement.sheet) return
  const originalCss = (styleElement as any).onecxOriginalCss as string

  // Construct new style element with available selector and original css with :root replaced with & and unwrappable rules extracted from supports rule to the top of the style sheet
  const actualCss = originalCss.replace(/:root/g, '&')
  const newStyleElement = document.createElement('style')
  const unwrappableRulesContent = Array.from(supportsRule.cssRules)
    .filter(isUnwrappableRule)
    .map((r) => r.cssText)
    .join('')
  const fromSelectorWithWhere = `:where(${fromSelector})`
  const newStyleContent = `${unwrappableRulesContent} ${fromSelectorWithWhere} {${actualCss}}`
  newStyleElement.appendChild(document.createTextNode(newStyleContent))

  // Remove old style element
  document.head.removeChild(styleElement)

  // Copy attributes from old style element to new one
  const attributes = styleElement.attributes
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes.item(i)
    if (attr) {
      newStyleElement.setAttribute(attr.name, attr.value)
    }
  }
  // Insert new style element
  document.head.appendChild(newStyleElement)
}

/**
 * This function operates on the CSSStyleSheet and deconstructs the @supports rule by deleting it and reinserting all rules inside the @supports rule.
 * Each rule that can be wrapped inside a selector (e.g., CSSStyleRule) is wrapped with the selector coming from the @scope rule.
 * @param sheet - CSSStyleSheet
 * @param supportsRule - CSSSupportsRule that contains the @scope rule
 * @param fromSelector - selector coming from the @scope rule (e.g., [data-style-id="shell-ui"])
 */
function legacyDeconstructScopeRule(sheet: CSSStyleSheet, supportsRule: CSSSupportsRule, fromSelector: string) {
  sheet.deleteRule(Array.from(sheet.cssRules).findIndex((rule) => rule === supportsRule))
  for (const rule of Array.from(supportsRule.cssRules)) {
    const index = sheet.cssRules.length <= 0 ? 0 : sheet.cssRules.length
    if (isWrappableRule(rule)) {
      const wrappedRuleText = rule.cssText.replace(/:scope/g, '&')
      const wrapped = `${normalize(fromSelector)} {${wrappedRuleText}}`
      sheet.insertRule(wrapped, index)
    } else {
      sheet.insertRule(rule.cssText, index)
    }
  }
}

function deconstructExistingStyleSheets() {
  const styleNodes = document.head.querySelectorAll('style')
  styleNodes.forEach((style) => deconstructScopeRule(style))
}

/**
 * Returns true if css rule can be wrapped inside a selector (e.g. CSSKeyFramesRule and CSSFontFaceRule can not be nested inside a selector)
 */
function isWrappableRule(rule: CSSRule) {
  return !(rule instanceof CSSKeyframesRule || rule instanceof CSSFontFaceRule)
}

/**
 * Returns true if css rule can not be wrapped inside a selector (e.g. CSSKeyFramesRule and CSSFontFaceRule can not be nested inside a selector)
 */
function isUnwrappableRule(rule: CSSRule) {
  return !isWrappableRule(rule)
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
export function createNodeList(nodes: Node[]) {
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
 * This function will transform new style sheets containing supports css rule to a style sheet that is understandable by all browsers that do not support the scope css rule.
 * After that operation, the style sheet will be considered updated if necessary.
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
          scopeSelectorsCache.get(sheet.ownerNode.ocxMatch) ?? new Map()
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
