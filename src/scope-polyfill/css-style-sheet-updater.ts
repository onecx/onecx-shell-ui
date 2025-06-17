import { MutationData, OcxCSSStyleSheet, SelectorPresenceMap } from './data'
import {
  animationNameValueRegex,
  appendToUniqueSelectors,
  computeRootSelectorsForElements,
  findSupportsRule,
  matchScope,
  normalize,
  removePseudoElements,
  scopeFromToUniqueId,
  splitSelectorToSubSelectors
} from './utils'

export class CssStyleSheetHandler {
  //-------------------------Scope sheet creation-------------------------
  /**
   * Transforms style sheet to scoped style sheet that implements the OcxCSSStyleSheet interface.
   */
  static changeToScopedSheet(sheetWithSupportsRule: CSSStyleSheet) {
    const supportsRule = findSupportsRule(sheetWithSupportsRule)
    if (!supportsRule) {
      console.warn('Expected style sheet with supports rule, but received one without any.')
      return
    }

    const [match, from, to] = matchScope(this.supportsConditionTextToScopeRuleText(supportsRule.conditionText)) ?? []
    if (!match) {
      console.warn('Expected to have a scoped sheet for:', sheetWithSupportsRule)
      return
    }
    // Save data about the scope so we can access it later and not recompute
    // Save data about the scope so we can access it later and not recompute
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(sheetWithSupportsRule as OcxCSSStyleSheet).ownerNode.ocxMatch = normalize(match)
    ;(sheetWithSupportsRule as OcxCSSStyleSheet).ownerNode.ocxFrom = normalize(from)
    ;(sheetWithSupportsRule as OcxCSSStyleSheet).ownerNode.ocxTo = normalize(to)
    ;(sheetWithSupportsRule as OcxCSSStyleSheet).ownerNode.ocxScopeUniqueId = scopeFromToUniqueId(normalize(from))
    ;(sheetWithSupportsRule as OcxCSSStyleSheet).ownerNode.ocxKeyFrames = []

    this.moveSupportsRulesToTopLevelAndApplyInitialScope(sheetWithSupportsRule as OcxCSSStyleSheet)
  }

  private static supportsConditionTextToScopeRuleText(conditionText: string) {
    // Removing braces from condition since its always wrapped with braces e.g., coditionText = (@scope(...))
    return conditionText.slice(1, -1)
  }

  /**
   * Deconstructs supports css rule so every scoped rule is available in the browser in a scoped manner initially with references to 0 elements.
   */
  private static moveSupportsRulesToTopLevelAndApplyInitialScope(sheet: OcxCSSStyleSheet) {
    const supportsRule = findSupportsRule(sheet)
    if (!supportsRule) return

    sheet.deleteRule(Array.from(sheet.cssRules).findIndex((rule) => rule === supportsRule))
    for (const supportsChildRule of Array.from(supportsRule.cssRules)) {
      sheet.insertRule(
        this.createSheetDefaultRuleText(supportsChildRule, sheet),
        sheet.cssRules.length <= 0 ? 0 : sheet.cssRules.length
      )
    }

    // Save the original selector data for making updates
    for (const rule of Array.from(sheet.cssRules)) {
      this.setOcxSelectorText(rule)
    }
  }

  private static createSheetDefaultRuleText(rule: CSSRule, sheet: OcxCSSStyleSheet) {
    if (rule instanceof CSSLayerBlockRule) {
      return this.createSheetDefaultLayerRuleText(rule, sheet)
    } else if (rule instanceof CSSMediaRule) {
      return this.createSheetDefaultMediaRuleText(rule, sheet)
    } else if (rule instanceof CSSKeyframesRule) {
      return this.createSheetDefaultKeyframesRuleText(rule, sheet)
    } else if ((rule as any).selectorText === undefined) {
      // Fallback to all Rules that are not covered
      return rule.cssText
    }

    return this.createSheetDefaultStyleRuleText(rule as CSSStyleRule & CSSGroupingRule, sheet)
  }

  private static createSheetDefaultLayerRuleText(rule: CSSLayerBlockRule, sheet: OcxCSSStyleSheet) {
    let layerCss = ''
    for (const layerChildRule of Array.from(rule.cssRules)) {
      const ruleText = this.createSheetDefaultRuleText(layerChildRule, sheet)
      layerCss = `${layerCss}${ruleText}`
    }
    return `@layer ${rule.name} {${layerCss}}`
  }

  private static createSheetDefaultMediaRuleText(rule: CSSMediaRule, sheet: OcxCSSStyleSheet) {
    let mediaCss = ''
    for (const mediaChildRule of Array.from(rule.cssRules)) {
      const ruleText = this.createSheetDefaultRuleText(mediaChildRule, sheet)
      mediaCss = `${mediaCss}${ruleText}`
    }
    return `@media ${rule.conditionText} {${mediaCss}}`
  }

  private static createSheetDefaultKeyframesRuleText(rule: CSSKeyframesRule, sheet: OcxCSSStyleSheet) {
    sheet.ownerNode.ocxKeyFrames.push(rule.name)
    return rule.cssText.replace(rule.name, this.applyScopeUniqueId(rule.name, sheet))
  }

  private static createSheetDefaultStyleRuleText(rule: CSSStyleRule & CSSGroupingRule, sheet: OcxCSSStyleSheet) {
    let childrenCss = ''
    for (const styleChildRule of Array.from(rule.cssRules).filter((rule) => rule.cssText)) {
      const ruleText = this.createSheetDefaultRuleText(styleChildRule, sheet)
      childrenCss = `${childrenCss}${ruleText}`
    }
    return this.constructStyleRuleText(rule, childrenCss, sheet)
  }

  private static constructStyleRuleText(rule: CSSStyleRule, childrenCss: string, sheet: OcxCSSStyleSheet) {
    if (childrenCss) {
      let ruleStyleText = rule.style.cssText
      if (ruleStyleText) ruleStyleText = this.applyAnimationChangesToCssText(ruleStyleText, sheet)
      return `${this.constructDefaultSelector(rule)} {${ruleStyleText}${childrenCss}}`
    }

    const updatedRuleText = rule.cssText.replace(rule.selectorText, this.constructDefaultSelector(rule))
    return this.applyAnimationChangesToCssText(updatedRuleText, sheet)
  }

  private static constructDefaultSelector(rule: CSSStyleRule) {
    if (rule.selectorText === ':scope') return `${rule.selectorText}:where(0)`
    return appendToUniqueSelectors(rule.selectorText, ':where(0)')
  }

  private static applyAnimationChangesToCssText(cssText: string, sheet: OcxCSSStyleSheet) {
    return cssText.replace(animationNameValueRegex, (match, p1) => {
      let animationName = p1
      if (sheet.ownerNode.ocxKeyFrames.includes(p1)) {
        animationName = this.applyScopeUniqueId(animationName, sheet)
      }
      return `animation-name: ${animationName}`
    })
  }

  private static applyScopeUniqueId(text: string, sheet: OcxCSSStyleSheet) {
    return `${text}-${sheet.ownerNode.ocxScopeUniqueId}`
  }

  private static setOcxSelectorText(rule: CSSRule) {
    const ruleSelectorText = (rule as any).selectorText
    if (ruleSelectorText) {
      const selectorText = this.constructOriginalSelector(ruleSelectorText)
      ;(rule as any).ocxSelectorText = selectorText
      ;(rule as any).ocxQuerySelectorText = removePseudoElements(selectorText)
    }
    for (const child of (rule as any).cssRules ?? []) {
      this.setOcxSelectorText(child)
    }
  }

  private static constructOriginalSelector(selectorText: string) {
    // Parse the current selector and remove any scoping
    if (selectorText === '') return ''

    let result = ''
    let depth = 0
    let i = 0
    while (i < selectorText.length) {
      if (selectorText.slice(i, i + 7) === ':where(') {
        if (i == 0 || [' ', '+', '>', '~'].includes(selectorText[i - 1])) {
          result += '*'
        }
        depth++
        i += 6 // Skip ':where('
      } else if (selectorText[i] === '(' && depth > 0) {
        depth++
      } else if (selectorText[i] === ')' && depth > 0) {
        depth--
      } else if (depth === 0) {
        result += selectorText[i]
      }
      i++
    }
    return result === '' ? '*' : result
  }
  //-------------------------Scope sheet creation-------------------------

  //-------------------------Scope sheet update-------------------------
  static updateScopedSheet(sheet: OcxCSSStyleSheet, mutationData: MutationData, cachedSelectors: SelectorPresenceMap) {
    const nodesMatchingFromSelector = Array.from(document.querySelectorAll(normalize(sheet.ownerNode.ocxFrom)))

    for (const cssRule of Array.from(sheet.cssRules)) {
      this.updateRule(cssRule, nodesMatchingFromSelector, sheet, mutationData, cachedSelectors)
    }

    // Mark sheet as updated by polyfill
    sheet.ownerNode.dataset['adaptedByPolyfillInMemory'] = ''
  }

  private static updateRule(
    cssRule: CSSRule,
    fromNodes: Element[],
    sheet: OcxCSSStyleSheet,
    mutationData: MutationData,
    cachedSelectors: SelectorPresenceMap
  ) {
    if (cssRule instanceof CSSLayerBlockRule) {
      this.updateLayerRule(cssRule, fromNodes, sheet, mutationData, cachedSelectors)
    } else if (cssRule instanceof CSSMediaRule) {
      this.updateMediaRule(cssRule, fromNodes, sheet, mutationData, cachedSelectors)
    } else if (cssRule instanceof CSSStyleRule) {
      this.updateStyleRule(cssRule as CSSStyleRule & CSSGroupingRule, fromNodes, sheet, mutationData, cachedSelectors)
    }
  }

  private static updateLayerRule(
    cssRule: CSSLayerBlockRule,
    fromNodes: Element[],
    sheet: OcxCSSStyleSheet,
    mutationData: MutationData,
    cachedSelectors: SelectorPresenceMap
  ) {
    for (const layerChildRule of Array.from(cssRule.cssRules)) {
      this.updateRule(layerChildRule, fromNodes, sheet, mutationData, cachedSelectors)
    }
  }

  private static updateMediaRule(
    cssRule: CSSMediaRule,
    fromNodes: Element[],
    sheet: OcxCSSStyleSheet,
    mutationData: MutationData,
    cachedSelectors: SelectorPresenceMap
  ) {
    for (const mediaChildRule of Array.from(cssRule.cssRules)) {
      this.updateRule(mediaChildRule, fromNodes, sheet, mutationData, cachedSelectors)
    }
  }

  /**
   * Validate if rule requires an update. If yes then find all elements in the scope that match the rule's selector and update the selector
   */
  private static updateStyleRule(
    cssRule: CSSStyleRule & CSSGroupingRule,
    fromNodes: Element[],
    sheet: OcxCSSStyleSheet,
    mutationData: MutationData,
    cachedSelectors: SelectorPresenceMap
  ) {
    const originalQuerySelectorText = (cssRule as any).ocxQuerySelectorText
    if (originalQuerySelectorText === undefined) return
    // Special case for styles that have to be applied for the @scope root
    if (originalQuerySelectorText === ':scope') {
      return this.updateScopeSelector(cssRule, fromNodes, sheet, mutationData, cachedSelectors)
    }

    if (
      mutationData.skipMutationCheck
        ? true
        : this.doesRuleRequireUpdate(originalQuerySelectorText, mutationData.mutatedElements, cachedSelectors)
    ) {
      this.updateElementsMatchingSelectorsInScope(cssRule, fromNodes, sheet)
      for (const child of Array.from(cssRule?.cssRules) ?? []) {
        this.updateRule(child, fromNodes, sheet, mutationData, cachedSelectors)
      }
    }
  }

  private static updateScopeSelector(
    cssRule: CSSStyleRule & CSSGroupingRule,
    fromNodes: Element[],
    sheet: OcxCSSStyleSheet,
    mutationData: MutationData,
    cachedSelectors: SelectorPresenceMap
  ) {
    // :scope selector has to be replaced with the selection of found @scope root elements
    // e.g., :scope {} -> :where(:nth-child(1) > :nth-child(2)) {}
    cssRule.selectorText = computeRootSelectorsForElements(fromNodes).join(', ')
    this.updateStyleRuleChildren(cssRule, fromNodes, sheet, mutationData, cachedSelectors)
  }

  private static updateStyleRuleChildren(
    cssRule: CSSStyleRule & CSSGroupingRule,
    fromNodes: Element[],
    sheet: OcxCSSStyleSheet,
    mutationData: MutationData,
    cachedSelectors: SelectorPresenceMap
  ) {
    for (const child of Array.from(cssRule?.cssRules) ?? []) {
      this.updateRule(child, fromNodes, sheet, mutationData, cachedSelectors)
    }
  }

  // If any subselector is fully matched the rule has to be updated
  private static doesRuleRequireUpdate(
    selectorText: string,
    mutatedElements: Element[],
    cachedSelectors: SelectorPresenceMap
  ): boolean {
    const subSelectorsList = splitSelectorToSubSelectors(selectorText)
    return subSelectorsList.some((subSelectorList) => {
      for (const subSelector of subSelectorList) {
        let isApplicable = cachedSelectors.get(subSelector)
        if (isApplicable === undefined) {
          isApplicable =
            mutatedElements.length === 0
              ? true
              : mutatedElements.some((element) => element.querySelector(subSelector) !== null)
          cachedSelectors.set(subSelector, isApplicable)
        }
        if (!isApplicable) return false
      }
      return true
    })
  }

  // Find all elements matching the selector in scope and replace rule selector
  private static updateElementsMatchingSelectorsInScope(
    cssStyleRule: CSSStyleRule,
    searchStartElements: Array<Element>,
    sheet: OcxCSSStyleSheet
  ) {
    const originalQuerySelectorText = (cssStyleRule as any).ocxQuerySelectorText
    const originalSelectorText = (cssStyleRule as any).ocxSelectorText
    const elementsMatchingSelector = searchStartElements
      .map((from) =>
        from.querySelectorAll(':is(' + originalQuerySelectorText + '):not(:scope :is(' + sheet.ownerNode.ocxTo + ') *)')
      )
      .flatMap((nodeList) => Array.from(nodeList))
    const elementsRootSelectors = computeRootSelectorsForElements(elementsMatchingSelector)
    const whereSelector = elementsRootSelectors.length > 0 ? elementsRootSelectors.join(', ') : '0'
    cssStyleRule.selectorText = appendToUniqueSelectors(originalSelectorText, `:where(${whereSelector})`)
  }
  //-------------------------Scope sheet update-------------------------
}
