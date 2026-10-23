import { resolve } from 'node:path'
import postcss, { AtRule } from 'postcss'
import { compile } from 'sass'

/*
 * Reflow (WCAG 1.4.10 / 1.4.4) checks for the shell frame styles.
 * jsdom has no layout engine, so the behaviour at 320/375 px and at 200%/400% zoom cannot be
 * measured here (manual check). These tests only make sure the reflow rules are scoped to the
 * shared reflow breakpoint, which covers 1280 px desktops at 200% zoom but not desktop widths.
 */

const DESKTOP_MIN_WIDTH = 1280
const DESKTOP_AT_200_PERCENT_ZOOM = DESKTOP_MIN_WIDTH / 2

function maxWidthMediaBreakpoints(relativePath: string): number[] {
  const { css } = compile(resolve(__dirname, relativePath))
  const breakpoints: number[] = []
  postcss.parse(css).walkAtRules('media', (atRule: AtRule) => {
    const match = /max-width:\s*(\d+)px/.exec(atRule.params)
    if (match) {
      breakpoints.push(Number(match[1]))
    }
  })
  return breakpoints
}

describe('shell frame reflow styles', () => {
  const viewportBreakpoints = maxWidthMediaBreakpoints('portal-viewport/portal-viewport.component.scss')
  const slotGroupBreakpoints = maxWidthMediaBreakpoints('slot-group/slot-group.component.scss')

  it('should put the reflow rules into exactly one narrow-viewport media query per component', () => {
    expect(viewportBreakpoints).toHaveLength(1)
    expect(slotGroupBreakpoints).toHaveLength(1)
  })

  it('should use the same breakpoint, between 200% zoom and desktop widths, in both components', () => {
    expect(slotGroupBreakpoints).toEqual(viewportBreakpoints)
    expect(viewportBreakpoints[0]).toBeGreaterThanOrEqual(DESKTOP_AT_200_PERCENT_ZOOM)
    expect(viewportBreakpoints[0]).toBeLessThan(DESKTOP_MIN_WIDTH)
  })
})
