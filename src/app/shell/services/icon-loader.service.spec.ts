/**
 * @jest-environment jsdom
 */

import { TestBed } from '@angular/core/testing'
import { FakeTopic } from '@onecx/accelerator'
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

  beforeEach(() => {
    jest.useFakeTimers()

    TestBed.configureTestingModule({
      providers: [
        ShellIconLoaderService,
        {
          provide: IconService,
          useValue: {
            iconTopic: FakeTopic.create(),
          },
        },
        {
          provide: ThemeService,
          useValue: {
            currentTheme$: FakeTopic.create(),
          },
        },
        {
          provide: IconBffService,
          useValue: {
            findIconsByNamesAndRefId: jest.fn(),
          },
        },
      ],
    })

    service = TestBed.inject(ShellIconLoaderService)
    iconService = TestBed.inject(IconService)
    themeService = TestBed.inject(ThemeService)
    iconBffService = TestBed.inject(IconBffService)

    iconTopic = iconService.iconTopic as any

    ;(window as any).onecxIcons = {}
    document.head.innerHTML = ''
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })


  it('should subscribe to IconRequested and trigger loadIcons after debounce', async () => {
    themeService.currentTheme$.publish({ name: 'dark' })

    const loadSpy = jest.spyOn(service as any, 'loadIcons').mockResolvedValue(undefined)

    service.init()

    iconTopic.publish({ type: 'IconRequested', name: 'home', classType: 'svg' })

    jest.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    await (service as any).loadIcons()

    expect(loadSpy).toHaveBeenCalled()
  })


  it('should return early if themeRefId is missing', async () => {
    service.init()

    const bffSpy = jest.spyOn(iconBffService, 'findIconsByNamesAndRefId')

    await (themeService as any).currentTheme$.publish(undefined)

    await (service as any).loadIcons()

    expect(bffSpy).not.toHaveBeenCalled()
  })


  it('should load missing icons, inject CSS and publish IconsReceived', async () => {
    themeService.currentTheme$.publish({ name: 'dark' })
    service.init()

    window.onecxIcons['home'] = undefined

    const icon: IconCache = { name: 'home', body: '<path />' } as any

    jest
      .spyOn(iconBffService, 'findIconsByNamesAndRefId')
      .mockReturnValue(of({ icons: [icon] }) as any)

    const publishSpy = jest.spyOn(iconTopic, 'publish')

    iconTopic.publish({ type: 'IconRequested', name: 'home', classType: 'svg' })
    iconTopic.publish({ type: 'IconRequested', name: 'home', classType: 'background' })

    jest.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    await (service as any).loadIcons()

    expect(window.onecxIcons['home']).toEqual(icon)
    expect(document.getElementById('onecx-theme-icon-svg-home')).toBeTruthy()
    expect(document.getElementById('onecx-theme-icon-background-home')).toBeTruthy()
    expect(publishSpy).toHaveBeenCalledWith({ type: 'IconsReceived' })
  })

  it('should set null when BFF does not return an icon', async () => {
    jest
      .spyOn(iconBffService, 'findIconsByNamesAndRefId')
      .mockReturnValue(of({ icons: [] }) as any)

    await (service as any).loadMissingIcons(['missing'], 'dark')

    expect(window.onecxIcons['missing']).toBeNull()
  })

  it('should set null when BFF returns undefined response', async () => {
    jest
      .spyOn(iconBffService, 'findIconsByNamesAndRefId')
      .mockReturnValue(of(undefined as any))

    await (service as any).loadMissingIcons(['home'], 'dark')

    expect(window.onecxIcons['home']).toBeNull()
  })

  it('should throw if BFF throws (surface error)', async () => {
    jest
      .spyOn(iconBffService, 'findIconsByNamesAndRefId')
      .mockReturnValue(throwError(() => new Error('BFF fail')))

    await expect(
      (service as any).loadMissingIcons(['home'], 'dark')
    ).rejects.toThrow('BFF fail')
  })


  it('should inject svg css', () => {
    (service as any).injectCss('home', 'svg', '<path />')

    const style = document.getElementById('onecx-theme-icon-svg-home')
    expect(style?.textContent).toContain('mask:')
  })

  it('should inject background css', () => {
    (service as any).injectCss('home', 'background', '<path />')

    const style = document.getElementById('onecx-theme-icon-background-home')
    expect(style?.textContent).toContain('background:url')
  })

  it('should inject background-before css', () => {
    (service as any).injectCss('home', 'background-before', '<path />')

    const style = document.getElementById('onecx-theme-icon-background-before-home')
    expect(style?.textContent).toContain('::before')
  })

  it('should not inject css twice for same class', () => {
    (service as any).injectCss('home', 'svg', '<path />')
    (service as any).injectCss('home', 'svg', '<path />')

    const styles = document.querySelectorAll('#onecx-theme-icon-svg-home')
    expect(styles.length).toBe(1)
  })

  it('should not inject css if icon has no body', async () => {
    themeService.currentTheme$.publish({ name: 'dark' })
    service.init()

    window.onecxIcons['home'] = { name: 'home' } as any

    iconTopic.publish({ type: 'IconRequested', name: 'home', classType: 'svg' })

    jest.advanceTimersByTime(100)
    await Promise.resolve()

    expect(document.getElementById('onecx-theme-icon-svg-home')).toBeNull()
  })


  it('should aggregate multiple types for same icon', () => {
    const record = (service as any).recordRequestedType.bind(service)

    record('home', 'svg')
    record('home', 'background')
    record('home', 'svg')

    const map = (service as any).requestedTypes

    expect(map.get('home')?.has('svg')).toBe(true)
    expect(map.get('home')?.has('background')).toBe(true)
    expect(map.get('home')?.size).toBe(2)
  })

  it('should clear requestedTypes after processing', async () => {
    themeService.currentTheme$.publish({ name: 'dark' })
    service.init()

    window.onecxIcons['home'] = null

    ;(service as any).recordRequestedType('home', 'svg')
    await (service as any).loadIcons()

    const map = (service as any).requestedTypes
    expect(map.size).toBe(0)
  })
})