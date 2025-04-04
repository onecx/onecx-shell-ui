import { OcxCSSStyleSheet } from './scope-data';

// export const fontFamilyValueRegex = /font-family:\s*([^\;]*)/;
export const animationNameValueRegex = /animation-name:\s*([^\;]*)/;
const everythingNotACharacterOrNumberRegex = /[^a-zA-Z0-9-]/g;

export function mutationListToUniqueNodes(mutationList: MutationRecord[]) {
  const set = new Set<Element>();
  for (const mutation of mutationList) {
    let nodes: Element[] = [];
    if (mutation.type === 'attributes')
      nodes = attributeMutationToNodes(mutation);
    else {
      nodes = childMutationToNodes(mutation);
    }

    nodes.forEach((node) => set.add(node));
  }
  return Array.from(set);
}

// Validate if style sheet contains only supports rule
export function doesContainOnlySupportsRule(sheet: CSSStyleSheet) {
  return (
    sheet.cssRules.length === 1 &&
    sheet.cssRules[0] instanceof CSSSupportsRule &&
    sheet.ownerNode instanceof HTMLElement
  );
}

// If style sheet is a OneCX scoped style sheet
export function isScopedStyleSheet(
  sheet: CSSStyleSheet
): sheet is OcxCSSStyleSheet {
  return (sheet.ownerNode as any).ocxMatch !== undefined;
}

// Find scope match in a string
export function matchScope(content: string): RegExpMatchArray | null {
  const scopeRegex =
    /@scope\s*\(\s*([^\(\)]+(?:\([^\(\)]+\))*(?::[^\(\)]+(?:\([^\(\)]+\))*)*)\s*\)\s*to\s*\(\s*([^\(\)]+(?:\([^\(\)]+\))*(?::[^\(\)]+(?:\([^\(\)]+\))*)*)\s*\)/;
  return content.match(scopeRegex);
}

// Split selector into list of subselectors
export function splitSelectorToSubSelectors(selectorText: string) {
  const uniqueSelectors = splitSelectorToUniqueSelectors(selectorText);
  const subSelectors: Array<Array<string>> = [];
  for (const selector of uniqueSelectors) {
    const chunks = constructSelectorChunks(selector);
    subSelectors.push(chunks);
  }
  return subSelectors;
}

export function appendToUniqueSelectors(
  selectorText: string,
  valueToAppend: string
) {
  return selectorText
    .split(',')
    .map((s) => `${s.trim()}${valueToAppend}`)
    .join(',');
}

// For each element compute its selector starting from root
export function computeRootSelectorsForElements(elements: Array<Element>) {
  const selectors = [];
  for (const element of elements) {
    const selector = computeRootSelectorForElement(element);
    selectors.push(`:root ${selector}`);
  }
  return selectors;
}

// Remove white spaces, new lines, etc. from a string
export function normalize(str: string): string {
  const newLineRegexGlobal = /\s+/g;
  return str.replace(newLineRegexGlobal, '') ?? '';
}

// Remove string duplicates from array
export function removeDuplicates(arr: Array<string>) {
  return arr.reduce((acc: string[], arrItem) => {
    if (!acc.some((item) => item === arrItem)) {
      acc.push(arrItem);
    }
    return acc;
  }, []);
}

// Map node to style id
export function nodeToStyleIdSelector(
  node: HTMLElement,
  isChildOfBody: boolean = false
) {
  const styleId = node.dataset['styleId'];
  const noPortalLayoutStyles = node.dataset['noPortalLayoutStyles'] === '';
  return noPortalLayoutStyles
    ? `[data-style-id="${styleId}"][data-no-portal-layout-styles]`
    : isChildOfBody
    ? `body>:not([data-no-portal-layout-styles])`
    : `[data-style-id]:not([data-no-portal-layout-styles])`;
}

export function scopeFromToUniqueId(from: string) {
  if (from === '[data-style-id]:not([data-no-portal-layout-styles])') {
    return 'portal-layout-styles';
  } else if (from === 'body>:not([data-no-portal-layout-styles])') {
    return 'dynamic-portal-layout-styles';
  }

  const styleIdMatch = from.match(/\[data-style-id="([^"]+)"/);
  return styleIdMatch
    ? styleIdMatch[1].replace(everythingNotACharacterOrNumberRegex, '-')
    : '';
}

// Map mutation type 'attribute' to elements
function attributeMutationToNodes(mutation: MutationRecord): Element[] {
  return mutation.target.nodeType === Node.ELEMENT_NODE
    ? [mutation.target as Element]
    : [];
}

// Map mutation type 'children' to elements
function childMutationToNodes(mutation: MutationRecord) {
  let nodes: Element[] = [];
  if (mutation.target === document.body) {
    nodes = bodyMutationToNodes(mutation);
  }

  if (mutation.addedNodes.length > 0) {
    nodes = mutationWithAddedNodesToNodes(mutation);
  }
  if (mutation.removedNodes.length > 0) {
    nodes = mutationWithRemovedNodesToNodes(mutation);
  }

  return nodes;
}

// Map mutation made to body element to elements
function bodyMutationToNodes(mutation: MutationRecord) {
  return [
    ...Array.from(mutation.addedNodes),
    ...Array.from(mutation.removedNodes),
  ].filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
}

// Map mutation with added nodes to elements
function mutationWithAddedNodesToNodes(mutation: MutationRecord) {
  if (mutation.target.parentElement) {
    return mutation.target.parentElement.nodeType === Node.ELEMENT_NODE
      ? [mutation.target.parentElement as Element]
      : [];
  }
  return mutation.target.nodeType === Node.ELEMENT_NODE
    ? [mutation.target as Element]
    : [];
}

// Map mutation with removed nodes to elements
function mutationWithRemovedNodesToNodes(mutation: MutationRecord) {
  return Array.from(mutation.removedNodes).filter(
    (n): n is Element => n.nodeType === Node.ELEMENT_NODE
  );
}

function splitSelectorToUniqueSelectors(selectorText: string) {
  return selectorText.split(',').map((s) => s.trim());
}

function constructSelectorChunks(selectorText: string) {
  let currentSelector = '';
  var chunks = [];
  var inPseudo = false;
  for (var i = 0; i < selectorText.length; i++) {
    var letter = selectorText[i];
    switch (letter) {
      case '(':
      case ')':
        inPseudo = letter === '(';
        currentSelector += letter;
        break;

      case '#':
      case '.':
        if (!inPseudo && selectorText[i - 1] !== ' ') {
          currentSelector && chunks.push(currentSelector);
        }
        currentSelector += letter;
        break;
      case ' ':
        if (!inPseudo) {
          chunks.push(currentSelector);
        }
        currentSelector += letter;
        break;

      case '+':
      case '>':
      case '~':
        currentSelector =
          selectorText[i - 1] === ' '
            ? chunks[chunks.length - 1] + ' '
            : currentSelector;
        currentSelector += letter + ' ';
        while (selectorText[++i] == ' ' && i < selectorText.length);
        i--;
        break;

      default:
        currentSelector += letter;
    }
  }
  if (
    chunks.length === 0 ||
    (chunks.length > 0 && chunks[chunks.length - 1] !== currentSelector)
  ) {
    chunks.push(currentSelector);
  }
  if (chunks.length > 0 && chunks[0] === '&') chunks.shift();
  return chunks;
}

function computeRootSelectorForElement(element: Element) {
  let currentElement: Element | null = element;
  let selector = '';
  while (currentElement && currentElement !== document.body.parentElement) {
    const index = Array.prototype.indexOf.call(
      currentElement.parentElement?.children ?? [],
      currentElement
    );
    selector = ` > :nth-child(${index + 1}) ${selector}`;
    currentElement = currentElement.parentElement;
  }
  return selector;
}
