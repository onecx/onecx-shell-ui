import { OcxCSSStyleSheet } from './data'

export const dataStyleIdKey = 'styleId'
export const dataStyleIsolationKey = 'styleIsolation'
export const dataNoPortalLayoutStylesKey = 'noPortalLayoutStyles'
export const dataIntermediateStyleIdKey = 'intermediateStyleId'
export const dataIntermediateStyleIsolationKey = 'intermediateStyleIsolation'
export const dataIntermediateNoPortalLayoutStylesKey = 'intermediateNoPortalLayoutStyles'
export const dataStyleIdAttribute = 'data-style-id'
export const dataStyleIsolationAttribute = 'data-style-isolation'
export const dataNoPortalLayoutStylesAttribute = 'data-no-portal-layout-styles'
export const dataIntermediateStyleIdAttribute = 'data-intermediate-style-id'
export const dataIntermediateStyleIsolationAttribute = 'data-intermediate-style-isolation'
export const dataIntermediateNoPortalLayoutStylesAttribute = 'data-intermediate-no-portal-layout-styles'

export const portalLayoutStylesSheetId = `[${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])`
export const dynamicPortalLayoutStylesSheetId = `body>:not([${dataNoPortalLayoutStylesAttribute}])`

// eslint-disable-next-line no-useless-escape
export const animationNameValueRegex = /animation-name:\s*([^\;]*)/
const everythingNotACharacterOrNumberRegex = /[^a-zA-Z0-9-]/g

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

// Validate if style sheet contains only supports rule
export function doesContainOnlySupportsRule(sheet: CSSStyleSheet) {
  return (
    sheet.cssRules.length === 1 &&
    sheet.cssRules[0] instanceof CSSSupportsRule &&
    sheet.ownerNode instanceof HTMLElement
  )
}

// If style sheet is a OneCX scoped style sheet
export function isScopedStyleSheet(sheet: CSSStyleSheet): sheet is OcxCSSStyleSheet {
  return (sheet.ownerNode as any).ocxMatch !== undefined
}

// Find scope match in a string
export function matchScope(content: string): RegExpMatchArray | null {
  const scopeRegex =
    // eslint-disable-next-line no-useless-escape
    /@scope\s*\((.*)(?=\)\s*)\)\s*to\s*\((.*)(?=\)\s*)\)/
  return scopeRegex.exec(content)
}

// Split selector into list of subselectors
export function splitSelectorToSubSelectors(selectorText: string) {
  const uniqueSelectors = splitSelectorToUniqueSelectors(selectorText)
  const subSelectors: Array<Array<string>> = []
  for (const selector of uniqueSelectors) {
    const chunks = new SelectorToChunksMapper().map(selector)
    subSelectors.push(chunks)
  }
  return subSelectors
}

export function appendToUniqueSelectors(selectorText: string, valueToAppend: string) {
  return selectorText
    .split(',')
    .map((s) => `${s.trim()}${valueToAppend}`)
    .join(',')
}

// For each element compute its selector starting from root
export function computeRootSelectorsForElements(elements: Array<Element>) {
  const selectors = []
  for (const element of elements) {
    const selector = computeRootSelectorForElement(element)
    selectors.push(`:root ${selector}`)
  }
  return selectors
}

// Remove white spaces, new lines, etc. from a string
export function normalize(str: string): string {
  const newLineRegexGlobal = /\s+/g
  return str.replace(newLineRegexGlobal, '') ?? ''
}

// Map node to style id
export function nodeToStyleIdSelector(node: HTMLElement) {
  const styleId = node.dataset[dataStyleIdKey]
  const noPortalLayoutStyles = node.dataset[dataNoPortalLayoutStylesKey] === ''

  if (!styleId) {
    return dynamicPortalLayoutStylesSheetId
  }

  return noPortalLayoutStyles
    ? `[${dataStyleIdAttribute}="${styleId}"][${dataNoPortalLayoutStylesAttribute}]`
    : portalLayoutStylesSheetId
}

export function scopeFromToUniqueId(from: string) {
  if (from === `[${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])`) {
    return 'portal-layout-styles'
  } else if (from === `body>:not([${dataNoPortalLayoutStylesAttribute}])`) {
    return 'dynamic-portal-layout-styles'
  }

  const styleIdMatch = /\[data-style-id="([^"]+)"/.exec(from)
  return styleIdMatch ? styleIdMatch[1].replace(everythingNotACharacterOrNumberRegex, '-') : ''
}

// Map mutation type 'attribute' to elements
function attributeMutationToNodes(mutation: MutationRecord): Element[] {
  return takeTargeNodeParentIfExistElseTargetNode(mutation)
}

// Map mutation type 'children' to elements
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

// Map mutation made to body element to elements
function bodyMutationToNodes(mutation: MutationRecord) {
  return [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].filter(
    (node): node is Element => node.nodeType === Node.ELEMENT_NODE
  )
}

// Map mutation with added nodes to elements
function mutationWithAddedNodesToNodes(mutation: MutationRecord) {
  return takeTargeNodeParentIfExistElseTargetNode(mutation)
}

function takeTargeNodeParentIfExistElseTargetNode(mutation: MutationRecord) {
  if (mutation.target.parentElement) {
    return mutation.target.parentElement.nodeType === Node.ELEMENT_NODE
      ? [mutation.target.parentElement as Element]
      : []
  }
  return mutation.target.nodeType === Node.ELEMENT_NODE ? [mutation.target as Element] : []
}

// Map mutation with removed nodes to elements
function mutationWithRemovedNodesToNodes(mutation: MutationRecord) {
  return Array.from(mutation.removedNodes).filter((n): n is Element => n.nodeType === Node.ELEMENT_NODE)
}

function splitSelectorToUniqueSelectors(selectorText: string) {
  return selectorText.split(',').map((s) => s.trim())
}

class SelectorToChunksMapper {
  currentSelector = ''
  chunks: string[] = []
  inPseudo = false

  private reset() {
    this.currentSelector = ''
    this.chunks = []
    this.inPseudo = false
  }

  private mapOpeningBrace() {
    this.inPseudo = true
    this.currentSelector += '('
  }

  private mapClosingBrace() {
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
