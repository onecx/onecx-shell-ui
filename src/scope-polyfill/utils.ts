import { OcxCSSStyleSheet } from './data'

// Duplicate definitions for some constants because cannot import libs in polyfill
export const shellScopeId = 'shell-ui'

export const dataStyleIdKey = 'styleId'
export const dataMfeElementKey = 'mfeElement'
export const dataStyleIsolationKey = 'styleIsolation'
export const dataNoPortalLayoutStylesKey = 'noPortalLayoutStyles'
export const dataIntermediateStyleIdKey = 'intermediateStyleId'
export const dataIntermediateMfeElementKey = 'intermediateMfeElement'
export const dataIntermediateStyleIsolationKey = 'intermediateStyleIsolation'
export const dataIntermediateNoPortalLayoutStylesKey = 'intermediateNoPortalLayoutStyles'
export const dataStyleIdAttribute = 'data-style-id'
export const dataMfeElementAttribute = 'data-mfe-element'
export const dataStyleIsolationAttribute = 'data-style-isolation'
export const dataNoPortalLayoutStylesAttribute = 'data-no-portal-layout-styles'
export const dataIntermediateStyleIdAttribute = 'data-intermediate-style-id'
export const dataIntermediateMfeElementAttribute = 'data-intermediate-mfe-element'
export const dataIntermediateStyleIsolationAttribute = 'data-intermediate-style-isolation'
export const dataIntermediateNoPortalLayoutStylesAttribute = 'data-intermediate-no-portal-layout-styles'

export const portalLayoutStylesSheetId = `[${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])`
export const dynamicPortalLayoutStylesSheetId = `body>:not([${dataNoPortalLayoutStylesAttribute}])`
export const shellStylesSheetId = `[${dataStyleIdAttribute}="${shellScopeId}"]`

// eslint-disable-next-line no-useless-escape
export const animationNameValueRegex = /animation-name:\s*([^\;]*)/
const everythingNotACharacterOrNumberRegex = /[^a-zA-Z0-9-]/g
// eslint-disable-next-line no-useless-escape
const pseudoElementsRegex = /::[a-zA-Z\-]*[\s\{\:]?/g
/**
 * Maps mutationRecord list to unique nodes that were changed
 */
export function mutationListToUniqueNodes(mutationList: MutationRecord[]) {
  const set = new Set<Element>()
  for (const mutation of mutationList) {
    let nodes: Element[] = []
    if (mutation.type === 'attributes') nodes = attributeMutationToNodes(mutation)
    else {
      nodes = childMutationToNodes(mutation)
    }

    nodes.forEach((node) => set.add(node))
  }
  return Array.from(set)
}

/**
 * Returns if style sheet contains supports rule with scope
 * */
export function containsSupportsRule(sheet: CSSStyleSheet) {
  return Array.from(sheet.cssRules).filter((rule) => rule instanceof CSSSupportsRule).length > 0
}

/**
 * Returns the supports rule from a style sheet or null
 */
export function findSupportsRule(sheet: CSSStyleSheet) {
  return Array.from(sheet.cssRules).find((rule) => rule instanceof CSSSupportsRule) as CSSSupportsRule
}

/**
 * Returns if style sheet is a OneCX scoped style sheet
 */
export function isScopedStyleSheet(sheet: CSSStyleSheet): sheet is OcxCSSStyleSheet {
  return (sheet.ownerNode as any).ocxMatch !== undefined
}

/**
 * Finds a match for scope rule in a text.
 */
export function matchScope(content: string): RegExpMatchArray | null {
  const scopeRegex =
    // eslint-disable-next-line no-useless-escape
    /@scope\s*\((.*)(?=\)\s*)\)\s*to\s*\((.*)(?=\)\s*)\)/
  return scopeRegex.exec(content)
}

/**
 * Removes pseudo elements (without parameters) from a selector.
 *
 * Example: ".pi-chevron-right::before" -> ".pi-chevron-right"
 */
export function removePseudoElements(selectorText: string) {
  const matches = selectorText.match(pseudoElementsRegex)
  if (!matches) return selectorText

  let modifiedSelectorText = selectorText
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const lastMatchChar = match[match.length - 1]
    modifiedSelectorText = modifiedSelectorText.replace(match, [' {:'].includes(lastMatchChar) ? lastMatchChar : '')
  }
  return modifiedSelectorText
}

/**
 * Appends a value to a selector before the first pseudo element.
 *
 * Example: ".pi::before" with value: ":where(:nth-child(1))" -> ".pi:where(:nth-child(1))::before"
 */
export function appendBeforeFirstPseudoElement(selectorText: string, valueToAppend: string): string {
  const pseudoElementIndex = selectorText.search(pseudoElementsRegex)
  if (pseudoElementIndex === -1) return `${selectorText}${valueToAppend}`

  return `${selectorText.substring(0, pseudoElementIndex)}${valueToAppend}${selectorText.substring(pseudoElementIndex, selectorText.length)}`
}

/**
 * Split selector into list of sub selectors.
 *
 * Example: ".pi, .pi .pi-chevron-right" -> [[".pi"], [".pi", ".pi pi-chevron-right"]]
 */
export function splitSelectorToSubSelectors(selectorText: string) {
  const uniqueSelectors = splitSelectorToUniqueSelectors(selectorText)
  const subSelectors: Array<Array<string>> = []
  for (const selector of uniqueSelectors) {
    const chunks = new SelectorToChunksMapper().map(selector)
    subSelectors.push(chunks)
  }
  return subSelectors
}

/**
 * Appends a value to each unique selector. Always appends before the first pseudo element.
 *
 * This is done because :where selector cannot be placed after pseudo elements like ::before because the selector is than invalid.
 *
 * Example: ".pi, .pi pi-chevron-right" with value: ":where(:nth-child(1))" -> ".pi:where(:nth-child(1)), .pi pi-chevron-right:where(:nth-child(1))"
 */
export function appendToUniqueSelectors(selectorText: string, valueToAppend: string) {
  return selectorText
    .split(',')
    .map((s) => appendBeforeFirstPseudoElement(s.trim(), valueToAppend))
    .join(',')
}

/**
 * Returns selector for all elements starting from root of the document using nth-child
 *
 * Example for first child of the root: ":root > :nth-child(1)"
 */
export function computeRootSelectorsForElements(elements: Array<Element>) {
  const selectors = []
  for (const element of elements) {
    const selector = computeRootSelectorForElement(element)
    selectors.push(`:root ${selector}`)
  }
  return selectors
}

/**
 * Remove white spaces, new lines, etc. from a string
 */
export function normalize(str: string): string {
  const newLineRegexGlobal = /\s+/g
  return str.replace(newLineRegexGlobal, '') ?? ''
}

/**
 * Map HTMLElement node to css selector based on the node dataset attributes.
 *
 * Returns:
 * - dynamic portal layout style selector for node with no information
 * - shell style selectors if node was in shell's scope
 * - portal layout styles selector if node was in app scope that needs portal layout styles
 * - found scope selector if node was in app scope that does not need portal layout styles
 */
export function nodeToStyleIdSelectors(node: HTMLElement) {
  const styleId = node.dataset[dataStyleIdKey]
  const noPortalLayoutStyles = node.dataset[dataNoPortalLayoutStylesKey] === ''

  // Node without styleId means it must have been added dynamically
  if (!styleId) {
    return [dynamicPortalLayoutStylesSheetId]
  }

  if (styleId === shellScopeId) {
    return [
      `[${dataStyleIdAttribute}="${shellScopeId}"]`,
      `[${dataStyleIdAttribute}="${shellScopeId}"][${dataNoPortalLayoutStylesAttribute}]`
    ]
  }

  const appStyles = `[${dataStyleIdAttribute}="${styleId}"]:is([${dataNoPortalLayoutStylesAttribute}], [${dataMfeElementAttribute}])`
  const primengAppStyles = `[${dataStyleIdAttribute}="${styleId}"][${dataNoPortalLayoutStylesAttribute}]`

  return noPortalLayoutStyles ? [appStyles, primengAppStyles] : [appStyles, portalLayoutStylesSheetId]
}

/**
 * Map scope css rule from section to a unique style scope id
 */
export function scopeFromToUniqueId(from: string) {
  if (from === portalLayoutStylesSheetId) {
    return 'portal-layout-styles'
  } else if (from === dynamicPortalLayoutStylesSheetId) {
    return 'dynamic-portal-layout-styles'
  }

  const styleIdMatch = /\[data-style-id="([^"]+)"/.exec(from)
  return styleIdMatch ? styleIdMatch[1].replace(everythingNotACharacterOrNumberRegex, '-') : ''
}

/**
 * Map mutation type 'attribute' to elements
 */
function attributeMutationToNodes(mutation: MutationRecord): Element[] {
  return takeTargeNodeParentIfExistElseTargetNode(mutation)
}

/**
 * Map mutation type 'children' to elements
 */
function childMutationToNodes(mutation: MutationRecord) {
  let nodes: Element[] = []
  if (mutation.target === document.body) {
    return bodyMutationToNodes(mutation)
  }

  if (mutation.addedNodes.length > 0) {
    nodes = mutationWithAddedNodesToNodes(mutation)
  }
  if (mutation.removedNodes.length > 0) {
    nodes = mutationWithRemovedNodesToNodes(mutation)
  }

  return nodes
}

/**
 * Map mutation made to body element to elements
 */
function bodyMutationToNodes(mutation: MutationRecord) {
  return [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].filter(
    (node): node is Element => node.nodeType === Node.ELEMENT_NODE
  )
}

/**
 * Map mutation with added nodes to elements
 */
function mutationWithAddedNodesToNodes(mutation: MutationRecord) {
  return takeTargeNodeParentIfExistElseTargetNode(mutation)
}

/**
 * Map mutation with removed nodes to elements
 */
function mutationWithRemovedNodesToNodes(mutation: MutationRecord) {
  return Array.from(mutation.removedNodes).filter((n): n is Element => n.nodeType === Node.ELEMENT_NODE)
}

/**
 * Returns mutation's target node parent or target node
 */
function takeTargeNodeParentIfExistElseTargetNode(mutation: MutationRecord) {
  if (mutation.target.parentElement) {
    return mutation.target.parentElement.nodeType === Node.ELEMENT_NODE
      ? [mutation.target.parentElement as Element]
      : []
  }
  return mutation.target.nodeType === Node.ELEMENT_NODE ? [mutation.target as Element] : []
}

/**
 * Returns selector list from selector by splitting them via comma
 */
function splitSelectorToUniqueSelectors(selectorText: string) {
  return selectorText.split(',').map((s) => s.trim())
}

/**
 * Mapper class for mapping css selectors into sub selector chunks
 */
class SelectorToChunksMapper {
  currentSelector = ''
  chunks: string[] = []
  inPseudo = false
  pseudoDepth = 0

  private reset() {
    this.currentSelector = ''
    this.chunks = []
    this.inPseudo = false
  }

  private mapOpeningBrace() {
    this.inPseudo = true
    this.pseudoDepth++
    this.currentSelector += '('
  }

  private mapClosingBrace() {
    if (this.inPseudo) {
      this.pseudoDepth--
      if (this.pseudoDepth === 0) this.inPseudo = false
    }
    this.currentSelector += ')'
  }

  private mapHash(previousCharacter: string) {
    this.mapDotOrHash(previousCharacter, '#')
  }

  private mapDot(previousCharacter: string) {
    this.mapDotOrHash(previousCharacter, '.')
  }

  private mapDotOrHash(previousCharacter: string, character: string) {
    if (!this.inPseudo && previousCharacter !== ' ') {
      this.currentSelector && this.chunks.push(this.currentSelector)
    }
    this.currentSelector += character
  }

  private mapSpace() {
    if (!this.inPseudo) {
      this.chunks.push(this.currentSelector)
    }
    this.currentSelector += ' '
  }

  private mapPlus(selectorText: string, iterator: number) {
    return this.mapPlusArrowRightOrTilde(selectorText, '+', iterator)
  }

  private mapArrowRight(selectorText: string, iterator: number) {
    return this.mapPlusArrowRightOrTilde(selectorText, '>', iterator)
  }

  private mapTilde(selectorText: string, iterator: number) {
    return this.mapPlusArrowRightOrTilde(selectorText, '~', iterator)
  }

  private mapPlusArrowRightOrTilde(selectorText: string, character: string, iterator: number) {
    this.currentSelector =
      selectorText[iterator - 1] === ' ' ? this.chunks[this.chunks.length - 1] + ' ' : this.currentSelector
    this.currentSelector += character + ' '
    while (selectorText[++iterator] == ' ' && iterator < selectorText.length);
    iterator--
    return iterator
  }

  /**
   * Maps css selector to sub selector chunks
   */
  map(selectorText: string) {
    this.reset()

    let i = 0
    while (i < selectorText.length) {
      const letter = selectorText[i]
      switch (letter) {
        case '(':
          this.mapOpeningBrace()
          break
        case ')':
          this.mapClosingBrace()
          break

        case '#':
          this.mapHash(selectorText[i - 1])
          break
        case '.':
          this.mapDot(selectorText[i - 1])
          break
        case ' ':
          this.mapSpace()
          break

        case '+':
          i = this.mapPlus(selectorText, i)
          break
        case '>':
          i = this.mapArrowRight(selectorText, i)
          break
        case '~':
          i = this.mapTilde(selectorText, i)
          break

        default:
          this.currentSelector += letter
      }
      i++
    }

    if (
      this.chunks.length === 0 ||
      (this.chunks.length > 0 && this.chunks[this.chunks.length - 1] !== this.currentSelector)
    ) {
      this.chunks.push(this.currentSelector)
    }
    if (this.chunks.length > 0 && this.chunks[0] === '&') this.chunks.shift()
    return this.chunks
  }
}

/**
 * Returns selector for element starting from root of the document using nth-child
 *
 * Example for first child of the root: " > :nth-child(1)"
 */
function computeRootSelectorForElement(element: Element) {
  let currentElement: Element | null = element
  let selector = ''
  while (currentElement && currentElement !== document.body.parentElement) {
    const index = Array.prototype.indexOf.call(currentElement.parentElement?.children ?? [], currentElement)
    selector = ` > :nth-child(${index + 1}) ${selector}`
    currentElement = currentElement.parentElement
  }
  return selector
}
