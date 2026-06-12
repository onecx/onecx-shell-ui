/**
 * @jest-environment jsdom
 */
import { TestBed } from '@angular/core/testing'
import { FakeTopic } from '@onecx/accelerator'
import { ThemeService } from '@onecx/angular-integration-interface'
import { theme as themeSchema } from '@onecx/integration-interface'

import { OverrideType, Theme } from 'src/app/shared/generated'
import { ThemeApplyService } from './theme-apply.service'
import { MARKED_AS_WRAPPED } from '../utils/styles/shared-styles-host-overwrites.utils'

describe('ThemeApplyService', () => {
  let service: ThemeApplyService
  let currentThemeTopic: FakeTopic<any>
  let currentThemesTopic: FakeTopic<any>

  const baseTheme = (overrides: Partial<Theme> = {}): Theme => ({
    name: 'my-theme',
    properties: '{}',
    ...overrides
  })

  beforeEach(() => {
    currentThemeTopic = new FakeTopic()
    currentThemesTopic = new FakeTopic()

    TestBed.configureTestingModule({
      providers: [
        ThemeApplyService,
        {
          provide: ThemeService,
          useValue: {
            currentTheme$: currentThemeTopic,
            currentThemes$: currentThemesTopic
          }
        }
      ]
    })

    service = TestBed.inject(ThemeApplyService)

    document.documentElement.removeAttribute('style')
    document.head.innerHTML = ''
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  describe('v1 theme', () => {
    it('publishes v1 theme and sets CSS custom properties', async () => {
      const properties = {
        general: { 'primary-color': '#ff0000', 'secondary-color': '#00ff00' },
        font: { 'font-family': 'Arial' }
      }
      const theme = baseTheme({ properties: JSON.stringify(properties) })

      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')
      const publishTheme = jest.spyOn(currentThemeTopic, 'publish')

      await service.applyTheme(theme)

      expect(publishThemes).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { v1: properties, v2: undefined },
          versions: [1]
        })
      )
      expect(publishTheme).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-theme', properties }))
      expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#ff0000')
      expect(document.documentElement.style.getPropertyValue('--secondary-color')).toBe('#00ff00')
      expect(document.documentElement.style.getPropertyValue('--font-family')).toBe('Arial')
    })
  })

  describe('v2 theme', () => {
    it('publishes v2-only theme and sets prefixed CSS variables', async () => {
      const v2 = { color: { primary: '#123456' } }
      jest.spyOn(themeSchema as any, 'safeParse').mockReturnValue({
        success: true,
        data: { v1: undefined, v2 }
      })

      const theme = baseTheme({ properties: '"v2": {' })

      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')
      const publishTheme = jest.spyOn(currentThemeTopic, 'publish')

      await service.applyTheme(theme)

      expect(publishThemes).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { v1: {}, v2 },
          versions: [2]
        })
      )
      expect(publishTheme).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-theme', properties: {} }))
      expect(document.documentElement.style.getPropertyValue('--onecx-theme-color-primary')).toBe('#123456')
    })

    it('publishes combined v1+v2 theme with versions [1, 2]', async () => {
      const v1 = { general: { 'primary-color': '#abcdef' } }
      const v2 = { color: { primary: '#123456' } }
      jest.spyOn(themeSchema as any, 'safeParse').mockReturnValue({
        success: true,
        data: { v1, v2 }
      })

      const theme = baseTheme({ properties: '"v2": {' })

      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')

      await service.applyTheme(theme)

      expect(publishThemes).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { v1, v2 },
          versions: [1, 2]
        })
      )
      expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#abcdef')
      expect(document.documentElement.style.getPropertyValue('--onecx-theme-color-primary')).toBe('#123456')
    })

    it('resolves {{...}} references to var(--onecx-theme-*)', async () => {
      const v2 = {
        color: { primary: '#123456' },
        button: { background: '{{color.primary}}' }
      }
      jest.spyOn(themeSchema as any, 'safeParse').mockReturnValue({
        success: true,
        data: { v1: undefined, v2 }
      })

      await service.applyTheme(baseTheme({ properties: '"v2": {' }))

      expect(document.documentElement.style.getPropertyValue('--onecx-theme-button-background')).toBe(
        'var(--onecx-theme-color-primary)'
      )
    })

    it('logs error and returns early when schema parsing fails', async () => {
      const parseError = new Error('invalid')
      jest.spyOn(themeSchema as any, 'safeParse').mockReturnValue({
        success: false,
        error: parseError
      })
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')
      const publishTheme = jest.spyOn(currentThemeTopic, 'publish')

      await service.applyTheme(baseTheme({ properties: '"v2": {' }))

      expect(errorSpy).toHaveBeenCalledWith('Failed to parse theme v2 properties:', parseError)
      expect(publishThemes).not.toHaveBeenCalled()
      expect(publishTheme).not.toHaveBeenCalled()
    })
  })

  describe('overrides', () => {
    it('appends CSS override style elements to document head', async () => {
      const theme = baseTheme({
        properties: JSON.stringify({}),
        overrides: [
          { type: OverrideType.CSS, value: '.foo { color: red; }' },
          { type: OverrideType.CSS, value: '.bar { color: blue; }' }
        ]
      })

      await service.applyTheme(theme)

      const styles = Array.from(document.head.querySelectorAll('style[data-css-overrides]'))
      expect(styles).toHaveLength(2)
      expect(styles[0].textContent).toBe('.foo { color: red; }')
      expect(styles[1].textContent).toBe('.bar { color: blue; }')
      styles.forEach((s) => {
        expect((s as HTMLElement).dataset[MARKED_AS_WRAPPED]).toBe('')
      })
    })

    it('ignores non-CSS overrides and overrides without a value', async () => {
      const theme = baseTheme({
        properties: JSON.stringify({}),
        overrides: [
          { type: OverrideType.PRIMENG, value: '{}' },
          { type: OverrideType.CSS, value: '' }
        ]
      })

      await service.applyTheme(theme)

      expect(document.head.querySelectorAll('style[data-css-overrides]')).toHaveLength(0)
    })

    it('does nothing when overrides array is empty', async () => {
      const theme = baseTheme({ properties: JSON.stringify({}), overrides: [] })

      await service.applyTheme(theme)

      expect(document.head.querySelectorAll('style[data-css-overrides]')).toHaveLength(0)
    })
  })

  describe('customCssVariables', () => {
    it('parses, publishes and applies custom CSS variables when present', async () => {
      const customCssVariables = { 'my-var': '#abcdef', 'other-var': '12px' }
      const theme = baseTheme({
        properties: JSON.stringify({}),
        customCssVariables: JSON.stringify(customCssVariables)
      })

      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')

      await service.applyTheme(theme)

      expect(publishThemes).toHaveBeenCalledWith(expect.objectContaining({ customCssVariables }))
      expect(document.documentElement.style.getPropertyValue('--my-var')).toBe('#abcdef')
      expect(document.documentElement.style.getPropertyValue('--other-var')).toBe('12px')
    })

    it('publishes undefined customCssVariables when the field is absent', async () => {
      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')

      await service.applyTheme(baseTheme({ properties: JSON.stringify({}) }))

      expect(publishThemes).toHaveBeenCalledWith(expect.objectContaining({ customCssVariables: undefined }))
    })

    it('skips setting CSS variables when parsed v1 properties are falsy', async () => {
      const theme = baseTheme({ properties: 'null' })
      const setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty')

      await service.applyTheme(theme)

      expect(setPropertySpy).not.toHaveBeenCalledWith(expect.stringMatching(/^--/), expect.anything())
    })
  })

  describe('applyThemeV2Variables edge cases', () => {
    it('skips null and undefined nested values without setting CSS variables', async () => {
      const v2 = {
        color: { primary: null, secondary: undefined, tertiary: '#abcdef' }
      }
      jest.spyOn(themeSchema as any, 'safeParse').mockReturnValue({
        success: true,
        data: { v1: undefined, v2 }
      })

      await service.applyTheme(baseTheme({ properties: '"v2": {' }))

      expect(document.documentElement.style.getPropertyValue('--onecx-theme-color-primary')).toBe('')
      expect(document.documentElement.style.getPropertyValue('--onecx-theme-color-secondary')).toBe('')
      expect(document.documentElement.style.getPropertyValue('--onecx-theme-color-tertiary')).toBe('#abcdef')
    })
  })

  describe('fonts', () => {
    it('does nothing when fonts is absent', async () => {
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}) }))

      expect(document.head.querySelectorAll('style[data-theme-fonts]')).toHaveLength(0)
    })

    it('does nothing when fonts is an empty array', async () => {
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify([]) }))

      expect(document.head.querySelectorAll('style[data-theme-fonts]')).toHaveLength(0)
    })

    it('injects a single style tag for all fonts', async () => {
      const fonts = [
        { fontFamily: 'MyFont', src: 'url("my-font.woff2") format("woff2")' },
        { fontFamily: 'OtherFont', src: 'url("other-font.woff2") format("woff2")' },
      ]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      expect(document.head.querySelectorAll('style[data-theme-fonts]')).toHaveLength(1)
    })

    it('injects @font-face rule with plain string src', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: 'url("my-font.woff2") format("woff2")' }]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain('@font-face')
      expect(style.textContent).toContain('font-family: "MyFont"')
      expect(style.textContent).toContain('src: url("my-font.woff2") format("woff2")')
    })

    it('injects @font-face rule with FontSourceDefinition (url + format)', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: { url: 'my-font.woff2', format: 'woff2' } }]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain('src: url("my-font.woff2") format("woff2")')
    })

    it('injects @font-face rule with FontSourceDefinition (url only, no format)', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: { url: 'my-font.woff2' } }]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain('src: url("my-font.woff2")')
      expect(style.textContent).not.toContain('format(')
    })

    it('injects @font-face rule with FontSourceDefinition (local)', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: { local: 'Helvetica Neue' } }]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain('src: local("Helvetica Neue")')
    })

    it('injects @font-face rule with FontSourceDefinition (local + format)', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: { local: 'Helvetica Neue Bold', format: 'truetype' } }]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain('src: local("Helvetica Neue Bold") format("truetype")')
    })

    it('injects @font-face rule with array of FontSourceDefinitions (fallback chain)', async () => {
      const fonts = [
        {
          fontFamily: 'MyFont',
          src: [
            { local: 'Helvetica Neue Bold' },
            { url: 'my-font.woff2', format: 'woff2' },
            { url: 'my-font.woff', format: 'woff' },
          ],
        },
      ]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain(
        'src: local("Helvetica Neue Bold"), url("my-font.woff2") format("woff2"), url("my-font.woff") format("woff")'
      )
    })

    it('includes optional descriptors mapped to kebab-case CSS', async () => {
      const fonts = [
        {
          fontFamily: 'MyFont',
          src: 'url("my-font.woff2")',
          fontWeight: '100 900',
          fontStyle: 'italic',
          fontDisplay: 'swap',
          fontStretch: '75% 125%',
          fontFeatureSettings: '"kern" 1',
          fontVariationSettings: '"wght" 400',
          unicodeRange: 'U+0025-00FF',
          ascentOverride: '90%',
          descentOverride: '10%',
          lineGapOverride: '5%',
          sizeAdjust: '110%',
        },
      ]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]')!
      expect(style.textContent).toContain('font-weight: 100 900')
      expect(style.textContent).toContain('font-style: italic')
      expect(style.textContent).toContain('font-display: swap')
      expect(style.textContent).toContain('font-stretch: 75% 125%')
      expect(style.textContent).toContain('font-feature-settings: "kern" 1')
      expect(style.textContent).toContain('font-variation-settings: "wght" 400')
      expect(style.textContent).toContain('unicode-range: U+0025-00FF')
      expect(style.textContent).toContain('ascent-override: 90%')
      expect(style.textContent).toContain('descent-override: 10%')
      expect(style.textContent).toContain('line-gap-override: 5%')
      expect(style.textContent).toContain('size-adjust: 110%')
    })

    it('marks the injected style tag with MARKED_AS_WRAPPED', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: 'url("my-font.woff2")' }]
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      const style = document.head.querySelector('style[data-theme-fonts]') as HTMLElement
      expect(style.dataset[MARKED_AS_WRAPPED]).toBe('')
    })

    it('removes previous font style tags on re-apply', async () => {
      const fontsFirst = [{ fontFamily: 'FirstFont', src: 'url("first.woff2")' }]
      const fontsSecond = [{ fontFamily: 'SecondFont', src: 'url("second.woff2")' }]

      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fontsFirst) }))
      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fontsSecond) }))

      const styles = document.head.querySelectorAll('style[data-theme-fonts]')
      expect(styles).toHaveLength(1)
      expect(styles[0].textContent).toContain('SecondFont')
      expect(styles[0].textContent).not.toContain('FirstFont')
    })

    it('publishes parsed fonts to currentThemes$', async () => {
      const fonts = [{ fontFamily: 'MyFont', src: 'url("my-font.woff2")' }]
      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')

      await service.applyTheme(baseTheme({ properties: JSON.stringify({}), fonts: JSON.stringify(fonts) }))

      expect(publishThemes).toHaveBeenCalledWith(expect.objectContaining({ fonts }))
    })

    it('publishes undefined fonts when fonts field is absent', async () => {
      const publishThemes = jest.spyOn(currentThemesTopic, 'publish')

      await service.applyTheme(baseTheme({ properties: JSON.stringify({}) }))

      expect(publishThemes).toHaveBeenCalledWith(expect.objectContaining({ fonts: undefined }))
    })
  })
})
