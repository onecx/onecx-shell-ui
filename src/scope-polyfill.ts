// INFO:
// 3 types of things can happen
// new style appears and needs to be transformed -> should be taken care of
// new elements are on a page that should utilize the scope styles -> should be taken care of
// existing style has updated values -> should be taken care of

import { CssStyleSheetHandler } from './css-style-sheet-updater'
import { OcxCSSStyleSheet, OcxOwnerNode, ScopeSelectorPresenceMap, SelectorPresenceMap } from './scope-data'
import {
  doesContainOnlySupportsRule,
  isScopedStyleSheet,
  mutationListToUniqueNodes,
  nodeToStyleIdSelector,
  normalize,
  removeDuplicates
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

function updateStyleSheets(mutationList: MutationRecord[]) {
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
  const styleIdSelectorsToUpdate = mutationList
    .map((record) => {
      if (record.target === document.body) return getChangedStyleIdSelectorForBodyChange(record)
      let currentNode: HTMLElement | null = record.target as HTMLElement
      while (currentNode && isChildOfBodyAndHasNoStyleId(currentNode)) {
        currentNode = currentNode.parentNode as HTMLElement
      }
      if (!currentNode || currentNode === document.body.parentNode) return null

      return nodeToStyleIdSelector(currentNode)
    })
    .filter((selector): selector is string => !!selector)

  return removeDuplicates(styleIdSelectorsToUpdate)
}

// Find style id for body change based on added and removed nodes
function getChangedStyleIdSelectorForBodyChange(record: MutationRecord) {
  const node = (record.addedNodes.item(0) ?? record.removedNodes.item(0)) as HTMLElement
  if (!node) return null

  return nodeToStyleIdSelector(node, true)
}

function isChildOfBodyAndHasNoStyleId(node: Node) {
  return node !== document.body.parentNode && !(node as any)?.dataset['styleId']
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
