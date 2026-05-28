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

      const theme = baseTheme({ properties: 'irrelevant \\"usages\\": here' })

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

      const theme = baseTheme({ properties: '\\"usages\\":' })

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

      await service.applyTheme(baseTheme({ properties: '\\"usages\\":' }))

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

      await service.applyTheme(baseTheme({ properties: '\\"usages\\":' }))

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
})
