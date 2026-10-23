import { join } from 'node:path'
import { compile } from 'sass'

/**
 * WCAG 2.3.3 / 2.2.2: checks the compiled shell styles for the prefers-reduced-motion rules.
 * The styles are compiled with sass (as in the build) and parsed by the CSSOM of jsdom.
 * Note: jsdom does not evaluate media queries, so the behaviour in a real browser with reduced motion
 * emulation has to be checked manually (see PR description).
 */
const rootDir = join(__dirname, '..', '..')
const reducedMotionQuery = 'prefers-reduced-motion: reduce'

function compileStyles(file: string): CSSStyleSheet {
  const { css } = compile(join(rootDir, file), { loadPaths: [rootDir], silenceDeprecations: ['import'] })
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  const sheet = style.sheet as CSSStyleSheet
  style.remove()
  return sheet
}

function styleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
}

function reducedMotionRules(sheet: CSSStyleSheet): CSSStyleRule[] {
  return Array.from(sheet.cssRules)
    .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
    .filter((rule) => rule.media.mediaText.includes(reducedMotionQuery))
    .flatMap((rule) => styleRules(rule.cssRules))
}

function ruleFor(rules: CSSStyleRule[], selector: string): CSSStyleRule {
  const rule = rules.find((r) => r.selectorText.split(',').some((s) => s.trim() === selector))
  if (!rule) throw new Error(`No reduced motion rule for "${selector}"`)
  return rule
}

describe('prefers-reduced-motion styles', () => {
  describe('global styles', () => {
    let rule: CSSStyleRule

    beforeAll(() => {
      rule = ruleFor(reducedMotionRules(compileStyles('src/global-styles.scss')), '*')
    })

    it('apply to all elements and pseudo elements', () => {
      const selectors = rule.selectorText.split(',').map((s) => s.trim())
      expect(selectors).toEqual(['*', '*::before', '*::after'])
    })

    it('stop every CSS animation after a single, zero-length run', () => {
      expect(rule.style.getPropertyValue('animation-duration')).toBe('0s')
      expect(rule.style.getPropertyValue('animation-delay')).toBe('0s')
      expect(rule.style.getPropertyValue('animation-iteration-count')).toBe('1')
      expect(rule.style.getPropertyPriority('animation-duration')).toBe('important')
      expect(rule.style.getPropertyPriority('animation-iteration-count')).toBe('important')
    })

    it('set all transitions to 0 ms', () => {
      expect(rule.style.getPropertyValue('transition-duration')).toBe('0s')
      expect(rule.style.getPropertyValue('transition-delay')).toBe('0s')
      expect(rule.style.getPropertyPriority('transition-duration')).toBe('important')
    })

    it('disable smooth scrolling', () => {
      expect(rule.style.getPropertyValue('scroll-behavior')).toBe('auto')
    })
  })

  describe('splash screen', () => {
    let rules: CSSStyleRule[]

    beforeAll(() => {
      rules = reducedMotionRules(compileStyles('src/splash.scss'))
    })

    it('appears without fade transition', () => {
      expect(ruleFor(rules, 'ocx-shell-root + .splash').style.getPropertyValue('transition')).toBe('none')
    })

    it('shows a static loader without rotation or colour cycling', () => {
      const loader = ruleFor(rules, 'ocx-shell-root + .splash .splash-content .splash-loader')
      const path = ruleFor(rules, 'ocx-shell-root + .splash .splash-content .splash-loader .splash-path')

      expect(loader.style.getPropertyValue('animation')).toBe('none')
      expect(path.style.getPropertyValue('animation')).toBe('none')
    })

    it('keeps the static ring visible in the theme-independent splash text colour', () => {
      const path = ruleFor(rules, 'ocx-shell-root + .splash .splash-content .splash-loader .splash-path')

      expect(path.style.getPropertyValue('stroke').toLowerCase()).toBe('currentcolor')
      expect(path.style.getPropertyValue('stroke-dashoffset')).toBe('46.75')
    })
  })

  describe('loading spinner', () => {
    let sheet: CSSStyleSheet
    let rules: CSSStyleRule[]

    beforeAll(() => {
      sheet = compileStyles('src/app/shell/components/app-loading-spinner/app-loading-spinner.component.scss')
      rules = reducedMotionRules(sheet)
    })

    it('rotates only without reduced motion', () => {
      expect(ruleFor(styleRules(sheet.cssRules), '.loader').style.getPropertyValue('animation')).toContain('infinite')
      expect(ruleFor(rules, '.loader').style.getPropertyValue('animation')).toBe('none')
    })

    it('shows the loading text only with reduced motion', () => {
      expect(ruleFor(styleRules(sheet.cssRules), '.loader-text').style.getPropertyValue('display')).toBe('none')
      expect(ruleFor(rules, '.loader-text').style.getPropertyValue('display')).toBe('block')
    })

    it('uses theme colours for the loading text', () => {
      const text = ruleFor(styleRules(sheet.cssRules), '.loader-text')

      expect(text.style.getPropertyValue('color')).toMatch(/^var\(--text-color/)
      expect(text.style.getPropertyValue('background-color')).toMatch(/^var\(--content-bg-color/)
    })
  })
})
