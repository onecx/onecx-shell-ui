import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('index.html splash screen', () => {
  let splash: HTMLElement

  beforeAll(() => {
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf-8')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    splash = doc.querySelector<HTMLElement>('.splash') as HTMLElement
  })

  it('exists', () => {
    expect(splash).not.toBeNull()
  })

  it('has no heading, so the shell pages keep a single, translated h1', () => {
    expect(splash.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]')).toBeNull()
    expect(splash.textContent?.trim()).toBe('')
  })

  it('hides the decorative splash graphic from assistive technology', () => {
    const svg = splash.querySelector('svg')

    expect(splash.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
    expect(splash.querySelector('[tabindex], a, button, input')).toBeNull()
  })
})
