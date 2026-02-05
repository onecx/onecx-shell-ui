import { TestBed } from '@angular/core/testing'
import { BehaviorSubject, Subject, of } from 'rxjs'
import { ShellIconLoaderService } from './icon-loader.services'
import { IconBffService } from 'src/app/shared/generated'
import { IconService, ThemeService } from '@onecx/angular-integration-interface'

jest.mock('@onecx/integration-interface', () => ({
  generateClassName: (name: string, classType: string) => `${name}-${classType}`
}))

describe('ShellIconLoaderService', () => {
  let service: ShellIconLoaderService

  const createIconLoaderTopic = () => {
    const subject = new Subject<any>()
    return {
      publish: (msg: any) => subject.next(msg),
      pipe: (...ops: any[]) => (subject as any).pipe(...ops),
      subscribe: (fn: any) => subject.subscribe(fn),
      _subject: subject
    } as any
  }

  let iconLoaderTopic: any
  let theme$: BehaviorSubject<{ name: string } | null>
  let mockBff: { findIconsByNamesAndRefId: jest.Mock }

  beforeEach(() => {
    jest.useFakeTimers()
    ;(window as any).onecxIcons = {}
    ;(globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')

    iconLoaderTopic = createIconLoaderTopic()
    theme$ = new BehaviorSubject<{ name: string } | null>(null)
    mockBff = {
      findIconsByNamesAndRefId: jest.fn((refId: string, { names }: { names: string[] }) =>
        of({ icons: names.map((n) => ({ name: n, body: '<path />' })) })
      )
    }

    TestBed.configureTestingModule({
      providers: [
        ShellIconLoaderService,
        { provide: IconService, useValue: { iconLoaderTopic } },
        { provide: IconBffService, useValue: mockBff },
        { provide: ThemeService, useValue: { currentTheme$: theme$ } }
      ]
    })

    service = TestBed.inject(ShellIconLoaderService)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should update themeRefId when theme changes after init', () => {
    service.init()
    theme$.next({ name: 'dark' })
    expect((service as any).themeRefId).toBe('dark')
  })

  it('should not call backend when themeRefId is undefined', async () => {
    service.init()

    const name = 'mdi:test'
    ;(window as any).onecxIcons[name] = undefined
    iconLoaderTopic.publish({ type: 'IconRequested', name, classType: 'svg' })

    jest.advanceTimersByTime(150)
    await Promise.resolve()

    expect(mockBff.findIconsByNamesAndRefId).not.toHaveBeenCalled()
  })

  it('should recordRequestedType creates and adds types without duplicates', () => {
    (service as any).recordRequestedType('a', 'svg')
    let types = (service as any).requestedTypes.get('a')
    expect(types?.has('svg')).toBe(true)
    ;(service as any).recordRequestedType('a', 'background')
    types = (service as any).requestedTypes.get('a')
    expect(types?.has('background')).toBe(true)
    ;(service as any).recordRequestedType('a', 'svg')
    expect((service as any).requestedTypes.get('a')?.size).toBe(2)
  })

  it('should not call backend when there are no missing icons', async () => {
    service.init()
    theme$.next({ name: 'default' })
    ;(window as any).onecxIcons['a'] = { name: 'a' }
    iconLoaderTopic.publish({ type: 'IconRequested', name: 'a', classType: 'svg' })

    jest.advanceTimersByTime(150)
    await Promise.resolve()

    expect(mockBff.findIconsByNamesAndRefId).not.toHaveBeenCalled()
  })

  it('should store null when backend returns no icon', async () => {
    service.init()
    theme$.next({ name: 'default' })
    ;(window as any).onecxIcons['missing'] = undefined
    mockBff.findIconsByNamesAndRefId.mockImplementation(() => of({ icons: [] }))

    iconLoaderTopic.publish({ type: 'IconRequested', name: 'missing', classType: 'svg' })
    jest.advanceTimersByTime(150)
    await Promise.resolve()

    expect((window as any).onecxIcons['missing']).toBeNull()
  })

  it('should injectCss be idempotent for the same class', () => {
    const spy = jest.spyOn(document.head, 'appendChild')
    ;(service as any).injectCss('x', 'svg', '<path />')
    ;(service as any).injectCss('x', 'svg', '<path />')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should clear requestedTypes after processing', async () => {
    service.init()
    theme$.next({ name: 'default' })
    ;(window as any).onecxIcons['a'] = undefined
    mockBff.findIconsByNamesAndRefId.mockImplementation(() => of({ icons: [{ name: 'a', body: '<path />' }] }))

    iconLoaderTopic.publish({ type: 'IconRequested', name: 'a', classType: 'svg' })
    jest.advanceTimersByTime(150)
    await Promise.resolve()
    await Promise.resolve()

    expect((service as any).requestedTypes.size).toBe(0)
  })

  it('should load missing icons and inject CSS after IconRequested', async () => {
    const iconName = 'test-icon'
    ;(window as any).onecxIcons[iconName] = undefined
    const publishSpy = jest.spyOn(iconLoaderTopic, 'publish')

    service.init()

    theme$.next({ name: 'light-theme' })

    iconLoaderTopic.publish({ type: 'IconRequested', name: iconName, classType: 'svg' })

    jest.advanceTimersByTime(150)

    await Promise.resolve()
    await Promise.resolve()

    expect(mockBff.findIconsByNamesAndRefId).toHaveBeenCalledWith('light-theme', { names: [iconName] })

    const styleEl = document.getElementById(`${iconName}-svg`)
    expect(styleEl).toBeTruthy()
    expect(styleEl?.textContent).toContain('--onecx-icon')

    expect(publishSpy).toHaveBeenCalledWith({ type: 'IconsReceived' })
  })

  it('should support background and background-before class types for same icon requested', async () => {
    const name = 'bg-icon'
    ;(window as any).onecxIcons[name] = undefined

    service.init()
    theme$.next({ name: 'dark' })

    iconLoaderTopic.publish({ type: 'IconRequested', name, classType: 'background' })
    iconLoaderTopic.publish({ type: 'IconRequested', name, classType: 'background-before' })

    jest.advanceTimersByTime(150)
    await Promise.resolve()
    await Promise.resolve()

    expect(document.getElementById(`${name}-background`)).toBeTruthy()
    expect(document.getElementById(`${name}-background-before`)).toBeTruthy()
  })
})
