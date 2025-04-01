// INFO:
// 3 types of things can happen
// new style appears and needs to be transformed -> should be taken care of
// new elements are on a page that should utilize the scope styles -> should be taken care of
// existing style has updated values -> should be taken care of

// TODO: Optimize the algorithm (don't compute on any changes? if possible?)
// IDEA: On change below document.body, check what elements changed and start computing only from there?

// Pop ups seem to not be styled correctly (look for "menu-style-onecx-tenant|onecx-tenant-ui"):
// -- TODO 3.1: Pop ups are not placed correctly in new apps? (Can be that e.g., keyframes rules are not correctly interpreted)
// -- TODO 3.2: Pop ups are nowhere to be found in legacy apps

// Optimize algorithm so re-computation does not happen hat often:
// -- optimized well enough for migrated apps
// -- TODO 1.1: further optimize solution for legacy apps

//Parse information about layers -> RESOLVED

const scopedStyleSheetCache = new Map();

export function applyScopePolyfill() {
  if (typeof CSSScopeRule === 'undefined') {
    let observer = new MutationObserver((mutationList: MutationRecord[]) =>
      updateStyleSheets(mutationList)
    );
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

function updateStyleSheets(mutationList: MutationRecord[]) {
  console.debug('Updating style sheets');
  console.debug(mutationList);
  const styleElements = document.styleSheets;

  const distinctStyleIdSelectors = getChangedStyleIdSelectors(mutationList);
  console.log(distinctStyleIdSelectors);
  for (const sheet of Array.from(styleElements)) {
    if (isSingleSupportsRule(sheet)) {
      const sheetWithSupports = {
        sheet,
        ownerNode: sheet.ownerNode as HTMLElement,
        supportsRule: sheet.cssRules[0] as CSSSupportsRule,
      };
      const [match, from, to] =
        matchScope(sheetWithSupports.supportsRule.conditionText) ?? [];
      if (
        isMatchedAndSelectorInChangedList(from, match, distinctStyleIdSelectors)
      ) {
        updateScopedStyleForSheet(sheetWithSupports, {
          selector: match,
          from,
          to,
        });
      }
    }
  }
}

function isMatchedAndSelectorInChangedList(
  selector: string,
  match: string | undefined,
  changedStyleIdSelectorList: Array<string>
): match is string {
  return (
    !!match &&
    changedStyleIdSelectorList.some(
      (styleIdSelector) => normalize(styleIdSelector) === normalize(selector)
    )
  );
}

function isSingleSupportsRule(sheet: CSSStyleSheet) {
  return (
    sheet.cssRules.length === 1 &&
    sheet.cssRules[0] instanceof CSSSupportsRule &&
    sheet.ownerNode instanceof HTMLElement
  );
}

function getChangedStyleIdSelectors(mutationList: MutationRecord[]) {
  const styleIdSelectorsToUpdate = mutationList
    .map((record) => {
      if (record.target === document.body)
        return getChangedStyleIdSelectorForBodyChange(record);
      let currentNode: HTMLElement | null = record.target as HTMLElement;
      while (currentNode && isChildOfBodyAndHasNoStyleId(currentNode)) {
        currentNode = currentNode.parentNode as HTMLElement;
      }
      if (!currentNode || currentNode === document.body.parentNode) return null;

      return nodeToStyleIdSelector(currentNode);
    })
    .filter((selector): selector is string => !!selector);

  return removeDuplicates(styleIdSelectorsToUpdate);
}

function getChangedStyleIdSelectorForBodyChange(record: MutationRecord) {
  const node = (record.addedNodes.item(0) ??
    record.removedNodes.item(0)) as HTMLElement;
  if (!node) return null;

  return nodeToStyleIdSelector(node, true);
}

function nodeToStyleIdSelector(
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

function isChildOfBodyAndHasNoStyleId(node: Node) {
  return (
    node !== document.body.parentNode && !(node as any)?.dataset['styleId']
  );
}

function removeDuplicates(arr: Array<string>) {
  return arr.reduce((acc: string[], arrItem) => {
    if (!acc.some((item) => item === arrItem)) {
      acc.push(arrItem);
    }
    return acc;
  }, []);
}

function updateScopedStyleForSheet(
  sheetWithSupports: CssStyleSheetWithSupportsRule,
  scopeData: ScopeData
) {
  // console.log('updateScopedStyleForSheet', sheetWithSupports);
  const scopedSheet = CssStyleSheetWithSupportsToScopedStyleSheetMapper.map(
    sheetWithSupports,
    scopeData
  );
  if (scopedSheet) {
    console.log(
      'Updating scope styles for sheet',
      sheetWithSupports.ownerNode.attributes
    );
    if (!scopedStyleSheetCache.has(sheetWithSupports.ownerNode)) {
      document.head.appendChild(scopedSheet.styleSheet);
      scopedStyleSheetCache.set(sheetWithSupports.ownerNode, scopedSheet);

      // Create an observer for the new style sheet
      let sheetObserver = new MutationObserver(() =>
        updateScopedStyleForExistingSheet(
          sheetWithSupports.ownerNode,
          scopeData
        )
      );
      sheetObserver.observe(sheetWithSupports.ownerNode, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    } else {
      const cachedSheet = scopedStyleSheetCache.get(
        sheetWithSupports.ownerNode
      );
      cachedSheet.styleSheet.textContent = scopedSheet.styleSheet.textContent;
    }
  }
}

function updateScopedStyleForExistingSheet(
  element: HTMLElement,
  scopeData: ScopeData
) {
  const cssStyleSheet = findCssStyleSheetForElement(element);
  cssStyleSheet &&
    updateScopedStyleForSheet(
      {
        sheet: cssStyleSheet,
        ownerNode: element,
        supportsRule: cssStyleSheet.cssRules[0] as CSSSupportsRule,
      },
      scopeData
    );
}

function findCssStyleSheetForElement(element: HTMLElement) {
  return Array.from(document.styleSheets).find(
    (sheet) => sheet.ownerNode === element
  );
}

interface CssStyleSheetWithSupportsRule {
  sheet: CSSStyleSheet;
  ownerNode: HTMLElement;
  supportsRule: CSSSupportsRule;
}

interface ScopeData {
  selector: string;
  from: string;
  to: string;
}

class CssStyleSheetWithSupportsToScopedStyleSheetMapper {
  static map(
    sheet: CssStyleSheetWithSupportsRule,
    scopeData: ScopeData
  ): ScopedStyleSheet | null {
    // console.log('matchedSheet', sheet, scopeData);
    const styleSheet = this.createScopedCssStyleSheet(
      sheet.supportsRule,
      scopeData
    );
    addAttributes(styleSheet, sheet.ownerNode);
    return new ScopedStyleSheet(scopeData, styleSheet);
  }

  private static createScopedCssStyleSheet(
    topLevelRule: CSSSupportsRule,
    scopeData: ScopeData
  ) {
    const styleSheet = document.createElement('style');
    const scopedCss = this.scopeSelectors(
      Array.from(topLevelRule.cssRules),
      scopeData
    );
    // console.log('scopedCss', scopedCss);
    styleSheet.textContent = scopedCss;
    return styleSheet;
  }

  private static scopeSelectors(
    cssRules: Array<CSSRule>,
    scopeData: ScopeData
  ) {
    // console.log('scopeSelectors', cssStyleRules, scopeData);
    const nodesMatchingFromSelector = Array.from(
      document.querySelectorAll(normalize(scopeData.from))
    );
    // console.log('nodesMatchingFromSelector', nodesMatchingFromSelector);
    let scopedCss = '';
    for (const cssRule of cssRules) {
      // console.log('rule', cssStyleRule);
      const ruleCss = this.appendScopedCssForRule(
        cssRule,
        nodesMatchingFromSelector,
        scopeData
      );
      scopedCss = `${scopedCss}${ruleCss}`;
    }
    return scopedCss;
  }

  private static appendScopedCssForRule(
    cssRule: CSSRule,
    fromNodes: Element[],
    scopeData: ScopeData
  ) {
    if (cssRule instanceof CSSLayerBlockRule) {
      return this.appendScopedCssForLayerRule(
        cssRule as CSSLayerBlockRule,
        fromNodes,
        scopeData
      );
    } else {
      return this.appendScopedCssForStyleRule(
        cssRule as CSSStyleRule,
        fromNodes,
        scopeData
      );
    }
  }

  private static appendScopedCssForStyleRule(
    cssRule: CSSStyleRule,
    fromNodes: Element[],
    scopeData: ScopeData
  ) {
    return this.findElementsMatchingSelectorsInScope(
      fromNodes,
      cssRule,
      scopeData
    );
  }

  private static appendScopedCssForLayerRule(
    cssRule: CSSLayerBlockRule,
    fromNodes: Element[],
    scopeData: ScopeData
  ) {
    let layerCss = '';
    for (const layerChildRule of Array.from(cssRule.cssRules)) {
      const ruleCss = this.appendScopedCssForRule(
        layerChildRule,
        fromNodes,
        scopeData
      );
      layerCss = `${layerCss}${ruleCss}`;
    }
    return `@layer ${cssRule.name} {${layerCss}}`;
  }

  private static findElementsMatchingSelectorsInScope(
    searchStartElements: Array<Element>,
    cssStyleRule: CSSStyleRule,
    scopeData: ScopeData
  ) {
    const elementsMatchingSelector = searchStartElements
      .map((from) =>
        from.querySelectorAll(
          ':is(' +
            cssStyleRule.selectorText +
            '):not(:scope :is(' +
            scopeData.to +
            ') *)'
        )
      )
      .flatMap((nodeList) => Array.from(nodeList));
    // console.log('elementsMatchingSelector', elementsMatchingSelector);
    const elementsRootSelectors = computeRootSelectorsForElements(
      elementsMatchingSelector
    );
    // console.log('elementsRootSelectors', elementsRootSelectors);
    return cssStyleRule.cssText.replace(
      cssStyleRule.selectorText,
      `${cssStyleRule.selectorText}:where(${elementsRootSelectors.join(', ')})`
    );
  }
}

class ScopedStyleSheet {
  scopeData: ScopeData;
  styleSheet: HTMLStyleElement;

  constructor(scopeData: ScopeData, styleSheet: HTMLStyleElement) {
    this.scopeData = scopeData;
    this.styleSheet = styleSheet;
  }
}

function matchScope(content: string): RegExpMatchArray | null {
  // TODO: Prepare real regex instead
  const scopeRegex =
    /@scope\s*\(\s*([^\(\)]+(?:\([^\(\)]+\))*(?::[^\(\)]+(?:\([^\(\)]+\))*)*)\s*\)\s*to\s*\(\s*([^\(\)]+(?:\([^\(\)]+\))*(?::[^\(\)]+(?:\([^\(\)]+\))*)*)\s*\)/;
  return content.match(scopeRegex);
}

function computeRootSelectorsForElements(elements: Array<Element>) {
  const selectors = [];
  for (const element of elements) {
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
    selectors.push(`:root ${selector}`);
  }
  return selectors;
}

function addAttributes(to: HTMLElement, from: HTMLElement) {
  for (const attr in from.dataset) {
    to.dataset[`customScope${capitalizeFirstChar(attr)}`] = from.dataset[attr];
  }
}

function capitalizeFirstChar(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalize(str: string): string {
  const newLineRegexGlobal = /\s+/g;
  return str.replace(newLineRegexGlobal, '') ?? '';
}
