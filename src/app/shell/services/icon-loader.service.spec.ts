/**
 * @jest-environment jsdom
 */
import { TestBed } from '@angular/core/testing'
import { ensureProperty, FakeTopic } from '@onecx/accelerator'
import { of, throwError } from 'rxjs'
import { ShellIconLoaderService } from './icon-loader.service'
import { IconService, ThemeService } from '@onecx/angular-integration-interface'
import { IconBffService } from 'src/app/shared/generated'
import { IconCache } from '@onecx/integration-interface'

describe('ShellIconLoaderService', () => {
  let service: ShellIconLoaderService
  let iconService: IconService
  let iconTopic: FakeTopic<any>
  let themeService: ThemeService
  let iconBffService: IconBffService

  const flushDebounce = async (ms = 100) => {
    jest.advanceTimersByTime(ms)
    await Promise.resolve()
    await Promise.resolve()
  }

  beforeEach(() => {
    jest.useFakeTimers()

    TestBed.configureTestingModule({
      providers: [
        ShellIconLoaderService,
        {
          provide: IconService,
          useValue: {
            iconTopic: FakeTopic.create()
          }
        },
        {
          provide: ThemeService,
          useValue: {
            currentTheme$: FakeTopic.create()
          }
        },
        {
          provide: IconBffService,
          useValue: {
            findIconsByNamesAndRefId: jest.fn()
          }
        }
      ]
    })

    service = TestBed.inject(ShellIconLoaderService)
    iconService = TestBed.inject(IconService)
    themeService = TestBed.inject(ThemeService)
    iconBffService = TestBed.inject(IconBffService)
    iconTopic = iconService.iconTopic as any
    ensureProperty(globalThis, ['onecxIcons'], {})
    document.head.innerHTML = ''

    if (!globalThis.btoa) {
      ensureProperty(globalThis, ['btoa'], (str : string) => Buffer.from(str, 'binary').toString('base64'));
    }
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('should handle themeService error during init', async () => {
    const themeService = TestBed.inject(ThemeService)
    jest.spyOn(console, 'error').mockImplementation()
    ;(themeService as any).currentTheme$ = throwError(() => new Error('boom'))

    service.init()

    await expect((service as any).themeRefPromise).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith('Error fetching current theme during initialization:', expect.any(Error))
  })

  it('should call loadIcons after IconRequested with debounce', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish({ name: 'dark' })
    const loadSpy = jest.spyOn<any, any>(service as any, 'loadIcons').mockResolvedValue(undefined)

    ensureProperty(globalThis, ['onecxIcons', 'home'], undefined)

    iconTopic.publish({ type: 'IconRequested', name: 'home', classType: 'svg' })

    await flushDebounce()

    expect(loadSpy).toHaveBeenCalled()
  })

  it('should fetch missing icons, inject CSS, and publish IconsReceived', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish({ name: 'dark' })
    ensureProperty(globalThis, ['onecxIcons', 'home'], undefined)
    const icon: IconCache = { name: 'home', body: '<path />' } as any
    const bffSpy = jest.spyOn(iconBffService, 'findIconsByNamesAndRefId').mockReturnValue(of({ icons: [icon] }) as any)

    const publishSpy = jest.spyOn(iconTopic, 'publish')

    await (service as any).loadIcons()

    expect(bffSpy).toHaveBeenCalledWith('dark', { names: ['home'] })
    expect(globalThis.onecxIcons!['home']).toEqual(icon)

    const style = document.getElementById('onecx-icons-css') as HTMLStyleElement
    expect(style).toBeTruthy()
    expect(style.textContent).toContain('onecx-theme-icon-svg-home')
    expect(style.textContent).toContain('onecx-theme-icon-background-home')
    expect(style.textContent).toContain('onecx-theme-icon-background-before-home')

    expect(publishSpy).toHaveBeenCalledWith({ type: 'IconsReceived' })
  })

  it('should do nothing when there are no missing icons', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish({ name: 'dark' })

    globalThis.onecxIcons = {}

    const bffSpy = jest.spyOn(iconBffService, 'findIconsByNamesAndRefId')
    const publishSpy = jest.spyOn(iconTopic, 'publish')

    await (service as any).loadIcons()

    expect(bffSpy).not.toHaveBeenCalled()
    expect(publishSpy).not.toHaveBeenCalledWith({ type: 'IconsReceived' })
  })

  it('should set icons to null and skip BFF when theme is missing', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish(undefined)

    ensureProperty(globalThis, ['onecxIcons', 'home'], undefined)

    const bffSpy = jest.spyOn(iconBffService, 'findIconsByNamesAndRefId')

    await (service as any).loadMissingIcons(['home'])

    expect(bffSpy).not.toHaveBeenCalled()
    expect(globalThis.onecxIcons!['home']).toBeNull()

    const style = document.getElementById('onecx-icons-css') as HTMLStyleElement
    expect(style).toBeTruthy()
    expect(style.textContent?.trim()).toBe('')
  })

  it('should set null when BFF returns no icons', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish({ name: 'dark' })

    jest.spyOn(iconBffService, 'findIconsByNamesAndRefId').mockReturnValue(of({ icons: [] }) as any)

    await (service as any).loadMissingIcons(['missing'])

    expect(globalThis.onecxIcons!['missing']).toBeNull()
  })

  it('should set null when BFF returns undefined response', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish({ name: 'dark' })

    jest.spyOn(iconBffService, 'findIconsByNamesAndRefId').mockReturnValue(of(undefined as any))

    await (service as any).loadMissingIcons(['home'])

    expect(globalThis.onecxIcons!['home']).toBeNull()
  })

  it('should handle BFF errors by logging and setting null', async () => {
    service.init()
    ;(themeService as any).currentTheme$.publish({ name: 'dark' })

    jest.spyOn(iconBffService, 'findIconsByNamesAndRefId').mockReturnValue(throwError(() => new Error('BFF fail')))

    const errorSpy = jest.spyOn(console, 'error').mockImplementation()

    await (service as any).loadMissingIcons(['home'])

    expect(errorSpy).toHaveBeenCalled()
    expect(globalThis.onecxIcons!['home']).toBeNull()
  })

  it('should create a singleton style element', () => {
    const ensure = (service as any).ensureGlobalStyle.bind(service)

    const s1 = ensure()
    const s2 = ensure()

    expect(s1).toBe(s2)

    const styles = document.querySelectorAll('#onecx-icons-css')
    expect(styles.length).toBe(1)
  })

  it('should insert rules for svg, background, and background-before', () => {
    const ensure = (service as any).ensureGlobalStyle.bind(service)
    const style = ensure()

    ;(service as any).injectCss('home', '<path />', style)

    const css = style.textContent ?? ''
    expect(css).toContain('onecx-theme-icon-svg-home')
    expect(css).toContain('onecx-theme-icon-background-home')
    expect(css).toContain('onecx-theme-icon-background-before-home')

    expect(css).toContain('mask:')
    expect(css).toContain('background:url')
    expect(css).toContain('::before')
  })
})
