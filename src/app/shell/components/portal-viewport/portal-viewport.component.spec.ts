import { LiveAnnouncer } from '@angular/cdk/a11y'
import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { BehaviorSubject, Observable, of, Subject } from 'rxjs'

import { AppStateService, Theme, ThemeService, UserService } from '@onecx/angular-integration-interface'
import { UserProfile } from '@onecx/integration-interface'

import { WorkspaceConfigBffService } from 'src/app/shared/generated/api/workspaceConfig.service'
import { PortalViewportComponent } from './portal-viewport.component'
import { RoutesService } from '../../services/routes.service'
import { LOADING_ANNOUNCE_DELAY_MS } from '../app-loading-spinner/app-loading-spinner.component'

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  trigger(entries: ResizeObserverEntry[]) {
    this.callback(entries, this as unknown as ResizeObserver)
  }
}

Object.assign(globalThis, { ResizeObserver: ResizeObserverMock })

function mockFileReader(result: string | null, includeTarget = true) {
  return jest.spyOn(window, 'FileReader').mockImplementation(
    () =>
      ({
        onload: null,
        readAsDataURL(this: { onload: ((event: ProgressEvent<FileReader>) => void) | null }) {
          this.onload?.({ target: includeTarget ? { result } : null } as ProgressEvent<FileReader>)
        }
      }) as unknown as FileReader
  )
}

describe('PortalViewportComponent', () => {
  const createFixture = (
    theme: Theme,
    profile: UserProfile | null,
    favicon: Observable<Blob | undefined> = of(new Blob(['icon'])),
    workspaceConfig: unknown | null = { getThemeFaviconByName: jest.fn(() => favicon) },
    emitTheme = true
  ) => {
    const currentTheme$ = new Subject<Theme>()
    const profile$ = new BehaviorSubject<UserProfile | null>(profile)
    const globalError$ = new Subject<string | undefined>()
    const get = jest.fn((): Observable<Blob | undefined> => favicon)
    TestBed.configureTestingModule({
      imports: [PortalViewportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AppStateService, useValue: { globalError$ } },
        { provide: UserService, useValue: { profile$ } },
        { provide: ThemeService, useValue: { currentTheme$ } },
        { provide: HttpClient, useValue: { get } },
        { provide: RoutesService, useValue: {} },
        { provide: WorkspaceConfigBffService, useValue: workspaceConfig }
      ]
    })
    const fixture = TestBed.createComponent(PortalViewportComponent)
    Object.defineProperty(fixture.componentInstance, 'workspaceConfigBffService', {
      configurable: true,
      value: workspaceConfig
    })
    if (emitTheme) {
      currentTheme$.next(theme)
    }
    return { fixture, component: fixture.componentInstance, currentTheme$, globalError$, get, profile$ }
  }

  it('applies user settings, reads the favicon, and reports global errors', async () => {
    const reader = mockFileReader('data:image/png;base64,icon')
    const fixtureData = createFixture({ name: 'dark', faviconUrl: '/favicon' }, {
      accountSettings: { layoutAndThemeSettings: { menuMode: 'OVERLAY', colorScheme: 'DARK' } }
    } as UserProfile)
    const error = jest.spyOn(console, 'error').mockImplementation()
    fixtureData.get.mockReturnValue(of(new Blob(['icon'])))
    fixtureData.component.ngOnInit()
    fixtureData.globalError$.next(undefined)
    fixtureData.globalError$.next('failed')
    fixtureData.component.logoLoadingEmitter.emit(true)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fixtureData.component.menuMode).toBe('overlay')
    expect(fixtureData.component.colorScheme).toBe('dark')
    expect(fixtureData.component.globalErrMsg).toBe('failed')
    expect(fixtureData.component.themeLogoLoadingFailed).toBe(true)
    expect(fixtureData.get).toHaveBeenCalledWith('/favicon', { responseType: 'blob' })
    expect(document.querySelector("link[rel~='icon']")?.getAttribute('href')).toContain('data:')
    expect(error).toHaveBeenCalledWith('global error')
    fixtureData.fixture.destroy()
    reader.mockRestore()
    error.mockRestore()
  })

  it('keeps defaults for an empty profile and ignores a missing workspace favicon', () => {
    document.head.innerHTML = '<link rel="icon" href="old">'
    const fixtureData = createFixture({ name: 'plain' }, null, of(undefined))
    fixtureData.component.ngOnInit()

    expect(fixtureData.component.menuMode).toBe('static')
    expect(fixtureData.component.colorScheme).toBe('light')
    expect(document.querySelector("link[rel~='icon']")?.getAttribute('href')).toBe('old')
    expect(fixtureData.get).not.toHaveBeenCalled()
    fixtureData.fixture.destroy()
  })

  it('skips workspace favicon loading when its service is absent', () => {
    const fixtureData = createFixture({ name: 'plain' }, null, of(undefined), null, false)
    fixtureData.currentTheme$.next({ name: 'plain' })

    expect(fixtureData.component).toBeTruthy()
    expect(fixtureData.get).not.toHaveBeenCalled()
    fixtureData.fixture.destroy()
  })

  it('uses an empty theme name when the workspace favicon service is available', () => {
    const getThemeFaviconByName = jest.fn(() => of())
    const fixtureData = createFixture({}, null, of(undefined), { getThemeFaviconByName }, false)
    fixtureData.currentTheme$.next({})

    expect(getThemeFaviconByName).toHaveBeenCalledWith('')
    fixtureData.fixture.destroy()
  })

  it('does not set the favicon when FileReader returns no result', async () => {
    const reader = mockFileReader(null)
    document.head.innerHTML = ''
    const fixtureData = createFixture({ name: 'theme', faviconUrl: '/favicon' }, null)
    fixtureData.get.mockReturnValue(of(new Blob(['icon'])))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector("link[rel~='icon']")?.getAttribute('href')).toBeNull()
    fixtureData.fixture.destroy()
    reader.mockRestore()
  })

  it('does not set the favicon when FileReader has no event target', async () => {
    const reader = mockFileReader(null, false)
    document.head.innerHTML = ''
    const fixtureData = createFixture({ name: 'theme', faviconUrl: '/favicon' }, null)
    fixtureData.get.mockReturnValue(of(new Blob(['icon'])))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector("link[rel~='icon']")?.getAttribute('href')).toBeNull()
    fixtureData.fixture.destroy()
    reader.mockRestore()
  })

  it('reuses an existing favicon link', async () => {
    document.head.innerHTML = '<link rel="icon" href="old">'
    const reader = mockFileReader('data:image/png;base64,updated')
    const fixtureData = createFixture({ name: 'theme', faviconUrl: '/favicon' }, null)
    fixtureData.get.mockReturnValue(of(new Blob(['icon'])))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.head.querySelectorAll("link[rel~='icon']")).toHaveLength(1)
    expect(document.querySelector("link[rel~='icon']")?.getAttribute('href')).toBe('data:image/png;base64,updated')
    fixtureData.fixture.destroy()
    reader.mockRestore()
  })

  describe('extensions slot', () => {
    it('stays rendered outside the main landmark, so the toast live region can be announced', () => {
      const { fixture } = createFixture({ name: 'plain' }, null, of(undefined), null, false)
      fixture.detectChanges()
      const slot: HTMLElement | null = fixture.nativeElement.querySelector('ocx-slot[name="onecx-shell-extensions"]')

      expect(slot).not.toBeNull()
      expect(slot?.classList).toContain('extensions-slot')
      expect(slot?.hasAttribute('hidden')).toBe(false)
      expect(slot?.getAttribute('aria-hidden')).toBeNull()
      expect(slot?.closest('main')).toBeNull()
      fixture.destroy()
    })
  })

  describe('skip link and main landmark', () => {
    it('renders the skip link first and exactly one main landmark without a theme', () => {
      const { fixture } = createFixture({ name: 'plain' }, null, of(undefined), null, false)
      fixture.detectChanges()
      const root: HTMLElement = fixture.nativeElement

      expect(root.firstElementChild?.matches('a.onecx-skip-link')).toBe(true)
      expect(root.querySelectorAll('main')).toHaveLength(1)
      expect(root.querySelector('main')?.getAttribute('tabindex')).toBe('-1')
      fixture.destroy()
    })

    it('renders exactly one main landmark on the global error page', () => {
      const { fixture, globalError$ } = createFixture({ name: 'plain' }, null, of(undefined), null, false)
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      fixture.detectChanges()
      globalError$.next('failed')
      fixture.detectChanges()

      expect(fixture.nativeElement.querySelectorAll('main')).toHaveLength(1)
      expect(fixture.nativeElement.querySelector('main ocx-shell-error')).not.toBeNull()
      errorSpy.mockRestore()
      fixture.destroy()
    })

    it('keeps the skip link href in sync after SPA navigation', () => {
      const { fixture } = createFixture({ name: 'plain' }, null, of(undefined), null, false)
      fixture.detectChanges()
      globalThis.history.pushState({}, '', '/other')
      fixture.detectChanges()

      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.onecx-skip-link')
      expect(link.getAttribute('href')?.startsWith('/other')).toBe(true)
      fixture.destroy()
    })

    it('focuses the main element and prevents default navigation on click', () => {
      const { fixture } = createFixture({ name: 'plain' }, null, of(undefined), null, false)
      fixture.detectChanges()
      document.body.appendChild(fixture.nativeElement)
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.onecx-skip-link')
      const main: HTMLElement = fixture.nativeElement.querySelector('main')
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })

      link.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(main)
      expect(link.getAttribute('href')).toContain('#ocx_main_content')
      fixture.nativeElement.remove()
      fixture.destroy()
    })
  })

  describe('loading state', () => {
    const renderThemed = (showContent$?: BehaviorSubject<boolean>) => {
      const data = createFixture({ name: 'plain' }, null, of(undefined), null, false)
      data.component.routesService = (showContent$ ? { showContent$ } : undefined) as unknown as RoutesService
      data.fixture.detectChanges()
      data.currentTheme$.next({ name: 'plain' })
      data.fixture.detectChanges()
      const root: HTMLElement = data.fixture.nativeElement
      return { ...data, root, main: () => root.querySelector('main') as HTMLElement }
    }

    afterEach(() => {
      jest.useRealTimers()
    })

    it('marks the main region busy and shows a hidden spinner while the content is loading', () => {
      const { fixture, main } = renderThemed(new BehaviorSubject(false))
      const spinner = main().querySelector('[data-testid="ocx-shell-loading-spinner"]')

      expect(main().getAttribute('aria-busy')).toBe('true')
      expect(main().getAttribute('id')).toBe('ocx_main_content')
      expect(spinner?.getAttribute('aria-hidden')).toBe('true')
      expect(main().querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull()
      expect(main().querySelector('router-outlet')).toBeNull()
      fixture.destroy()
    })

    it('removes aria-busy and the spinner once the content is shown', () => {
      const showContent$ = new BehaviorSubject(false)
      const { fixture, main } = renderThemed(showContent$)

      showContent$.next(true)
      fixture.detectChanges()

      expect(main().hasAttribute('aria-busy')).toBe(false)
      expect(main().querySelector('ocx-shell-loading-spinner')).toBeNull()
      expect(main().querySelector('router-outlet')).not.toBeNull()
      fixture.destroy()
    })

    it('is not busy when no routes service is available', () => {
      const { fixture, main } = renderThemed()

      expect(main().hasAttribute('aria-busy')).toBe(false)
      expect(main().querySelector('router-outlet')).not.toBeNull()
      fixture.destroy()
    })

    it('announces "Loading" only once although loading is signalled repeatedly', async () => {
      jest.useFakeTimers()
      const showContent$ = new BehaviorSubject(false)
      const { fixture } = renderThemed(showContent$)
      const announce = jest.spyOn(TestBed.inject(LiveAnnouncer), 'announce').mockResolvedValue()

      showContent$.next(false)
      fixture.detectChanges()
      await jest.advanceTimersByTimeAsync(5 * LOADING_ANNOUNCE_DELAY_MS)

      expect(announce).toHaveBeenCalledTimes(1)
      expect(announce).toHaveBeenCalledWith('LOADING', 'polite')
      fixture.destroy()
    })
  })
})
