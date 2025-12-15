import {
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported,
  replaceRootAndHtmlWithScope
} from '@onecx/angular-utils'
import { MARKED_FOR_WRAPPING, MARKED_AS_WRAPPED } from './shared-styles-host-overwrites.utils'

/**
 * Updates styles that require wrapping added to the document head.
 *
 * Affects only styles that:
 * - have attribute MARKED_FOR_WRAPPING defined
 * - are not already wrapped by scope or supports rules
 * - are not already wrapped by nghost attributes
 * @param mutationList - list of mutations to process
 */
export function updateRequiredWrappingStyles(mutationList: MutationRecord[]) {
  const newStyleNodesRequiringWrapping = mutationList
    .flatMap((mutation) => Array.from(mutation.addedNodes))
    .filter((node) => doesStyleRequireWrapping(node))

  newStyleNodesRequiringWrapping.forEach((node) => {
    if (!node.textContent) {
      markAsWrapped(node)
      return
    }

    const styleElement = node as HTMLStyleElement
    const markedForWrapping = styleElement.dataset[MARKED_FOR_WRAPPING]
    if (!markedForWrapping) {
      markAsWrapped(node)
      return
    }

    replaceAndWrapStyle(styleElement, markedForWrapping)
  })
}

/**
 * Checks if style requires wrapping.
 *
 * Style requires wrapping if it contains attribute MARKED_FOR_WRAPPING.
 * @param node - node to check
 * @returns {boolean} whether style requires wrapping
 */
function doesStyleRequireWrapping(node: Node): boolean {
  // Check if node is style node and contains attribute called MARKED_FOR_WRAPPING
  if (node.nodeName !== 'STYLE') {
    return false
  }

  const styleElement = node as HTMLStyleElement
  const markedForWrapping = styleElement.dataset[MARKED_FOR_WRAPPING]
  return !!markedForWrapping
}

/**
 * Deletes the MARKED_FOR_WRAPPING attribute from the style element and adds MARKED_AS_WRAPPED attribute.
 * @param styleElement - style element to mark
 */
function markAsWrapped(styleElement: Node) {
  if (styleElement.nodeName !== 'STYLE') {
    return
  }

  const styleEl = styleElement as HTMLStyleElement
  delete styleEl.dataset[MARKED_FOR_WRAPPING]
  styleEl.dataset[MARKED_AS_WRAPPED] = ''
}

/**
 * Replaces and wraps style content with scope rule.
 * @param styleElement - style element to replace
 * @param styleId - style id to use for wrapping
 * @returns {void}
 */
function replaceAndWrapStyle(styleElement: HTMLStyleElement, styleId: string) {
  if (!styleElement.textContent || isStyleWrapped(styleElement, styleId)) {
    markAsWrapped(styleElement)
    return
  }

  const newStyleElement = document.createElement('style')
  if (isCssScopeRuleSupported()) {
    const content = `
      @scope([${dataStyleIdAttribute}="${styleId}"]) to ([${dataStyleIsolationAttribute}]) {
        ${replaceRootAndHtmlWithScope(styleElement.textContent)}
      }
      `
    newStyleElement.appendChild(document.createTextNode(content))
  } else {
    const content = `
      @supports(@scope([${dataStyleIdAttribute}="${styleId}"]) to ([${dataStyleIsolationAttribute}])) {
        ${replaceRootAndHtmlWithScope(styleElement.textContent)}
      }
      `
    newStyleElement.appendChild(document.createTextNode(content))
    ;(newStyleElement as any).onecxOriginalCss = styleElement.textContent
  }

  copyDataset(styleElement.dataset, newStyleElement.dataset)
  markAsWrapped(newStyleElement)

  styleElement.replaceWith(newStyleElement)
}

/**
 * Checks if style is already wrapped.
 *
 * Style is considered wrapped if:
 * - it contains Angular component styles ([_nghost] attribute)
 * - it is marked as wrapped via MARKED_AS_WRAPPED attribute
 * - it contains scope rule for the given styleId
 * - it contains supports rule for the given styleId (in case scope rules are not supported)
 * @param styleElement
 * @param styleId
 * @returns {boolean} whether style is already wrapped
 */
function isStyleWrapped(styleElement: HTMLStyleElement, styleId: string): boolean {
  if (styleElement.textContent?.includes('[_nghost') || styleElement.dataset[MARKED_AS_WRAPPED] !== undefined) {
    return true
  }
  if (isCssScopeRuleSupported()) {
    return styleElement.textContent?.includes(`@scope([${dataStyleIdAttribute}="${styleId}"]`) ?? false
  } else {
    return styleElement.textContent?.includes(`@supports(@scope([${dataStyleIdAttribute}="${styleId}"]`) ?? false
  }
}

/**
 * Copies dataset from source to target.
 * @param source - source dataset
 * @param target - target dataset
 */
function copyDataset(source: DOMStringMap, target: DOMStringMap) {
  Object.keys(source).forEach((key) => {
    target[key] = source[key]
  })
}
