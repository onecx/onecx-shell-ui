import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss, { AtRule, Declaration, Root, Rule } from 'postcss'
import { compile } from 'sass'

/*
 * Reflow (WCAG 1.4.10 / 1.4.4) checks for the shell frame styles.
 * jsdom has no layout engine, so the bounding-box behaviour at 320/375 px and at 200%/400% zoom
 * cannot be measured here. These tests check the compiled styles instead: the reflow rules exist
 * for narrow viewports and are scoped so that desktop widths (1280 px and above) are not affected.
 */

const DESKTOP_MIN_WIDTH = 1280

function compileStyles(relativePath: string): Root {
  const { css } = compile(resolve(__dirname, relativePath))
  return postcss.parse(css)
}

function maxWidthOf(atRule: AtRule): number {
  const match = /max-width:\s*(\d+)px/.exec(atRule.params)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

function reflowMediaRules(root: Root): Rule[] {
  const rules: Rule[] = []
  root.walkAtRules('media', (atRule) => {
    if (maxWidthOf(atRule) < DESKTOP_MIN_WIDTH) {
      atRule.walkRules((rule) => {
        rules.push(rule)
      })
    }
  })
  return rules
}

function declarationsOf(rules: Rule[], selector: string): Record<string, string> {
  const declarations: Record<string, string> = {}
  rules
    .filter((rule) => rule.selectors.includes(selector))
    .forEach((rule) =>
      rule.walkDecls((decl: Declaration) => {
        declarations[decl.prop] = decl.value
      })
    )
  return declarations
}

function topLevelDeclarations(root: Root, selector: string): Record<string, string> {
  const rules: Rule[] = []
  root.each((node) => {
    if (node.type === 'rule') {
      rules.push(node)
    }
  })
  return declarationsOf(rules, selector)
}

const globalMobileBreakpoint = Number(
  /\$mobileBreakpoint:\s*(\d+)px/.exec(readFileSync(resolve(__dirname, '../../../global-styles.scss'), 'utf8'))?.[1]
)

describe('shell frame reflow styles', () => {
  describe('portal viewport', () => {
    const root = compileStyles('portal-viewport/portal-viewport.component.scss')
    const mobileRules = reflowMediaRules(root)

    it('should use the shell mobile breakpoint, which is below desktop widths', () => {
      const breakpoints: number[] = []
      root.walkAtRules('media', (atRule) => {
        if (/max-width/.test(atRule.params)) {
          breakpoints.push(maxWidthOf(atRule))
        }
      })

      expect(breakpoints).toEqual([globalMobileBreakpoint])
      expect(globalMobileBreakpoint).toBeLessThan(DESKTOP_MIN_WIDTH)
    })

    it('should let the top bar wrap instead of overflowing the viewport on narrow screens', () => {
      expect(declarationsOf(mobileRules, '.onecx-header')).toEqual({
        'flex-wrap': 'wrap',
        'flex-shrink': '0',
        'min-width': '0',
        'max-width': '100%'
      })
      expect(declarationsOf(mobileRules, '.onecx-header > div')).toEqual({ 'min-width': '0' })
    })

    it('should keep the frame within the viewport width and scroll vertically on narrow screens', () => {
      expect(declarationsOf(mobileRules, '.onecx-viewport-wrapper')).toEqual({
        'max-width': '100%',
        'overflow-y': 'auto'
      })
      expect(declarationsOf(mobileRules, '.onecx-body-wrapper')).toEqual({ 'min-height': '50dvh' })
      expect(declarationsOf(mobileRules, '.onecx-body-wrapper .onecx-body-start')).toEqual({ 'max-width': '100%' })
      expect(declarationsOf(mobileRules, '.onecx-body-wrapper .onecx-body-end')).toEqual({ 'max-width': '100%' })
      expect(declarationsOf(mobileRules, '.onecx-body-wrapper .onecx-body-center')).toEqual({ 'min-width': '0' })
    })

    it('should keep the desktop layout rules unchanged', () => {
      expect(topLevelDeclarations(root, '.onecx-viewport-wrapper')).toEqual({
        display: 'flex',
        'flex-direction': 'column',
        height: '100dvh'
      })
      const header = topLevelDeclarations(root, '.onecx-header')
      expect(header['flex-wrap']).toBeUndefined()
      expect(header['flex-shrink']).toBeUndefined()
      expect(header['min-width']).toBeUndefined()
      expect(header['max-width']).toBeUndefined()
      expect(topLevelDeclarations(root, '.onecx-body-wrapper')['min-height']).toBeUndefined()
    })
  })

  describe('slot group', () => {
    const root = compileStyles('slot-group/slot-group.component.scss')
    const mobileRules = reflowMediaRules(root)

    it('should only contain rules for narrow viewports', () => {
      const topLevelRules = root.nodes.filter((node) => node.type === 'rule')
      expect(topLevelRules).toHaveLength(0)

      root.walkAtRules('media', (atRule) => {
        expect(maxWidthOf(atRule)).toBe(globalMobileBreakpoint)
      })
    })

    it.each([':host(.flex-row)', ':host(.flex-row-reverse)'])(
      'should wrap row slot groups and their slots on narrow screens (%s)',
      (host) => {
        const expected = { 'flex-wrap': 'wrap', 'min-width': '0', 'max-width': '100%' }
        expect(declarationsOf(mobileRules, host)).toEqual(expected)
        expect(declarationsOf(mobileRules, `${host} > ocx-slot`)).toEqual(expected)
      }
    )

    it('should not change column slot groups (side menus)', () => {
      expect(declarationsOf(mobileRules, ':host(.flex-column)')).toEqual({})
    })
  })
})
