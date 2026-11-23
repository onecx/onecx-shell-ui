import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, map, Observable, of, Subject } from 'rxjs'

import { AppStateService, Theme, ThemeService, UserService } from '@onecx/angular-integration-interface'
import { SlotService } from '@onecx/angular-remote-components'
import { UserProfile } from '@onecx/integration-interface'

import { WorkspaceConfigBffService } from 'src/app/shared/generated/api/workspaceConfig.service'
import { PortalViewportComponent } from './portal-viewport.component'
import { RoutesService } from '../../services/routes.service'

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

class SlotServiceStub {
  readonly slotsWithContent$ = new BehaviorSubject<string[]>([])

  isSomeComponentDefinedForSlot(slotName: string): Observable<boolean> {
    return this.slotsWithContent$.pipe(map((slotNames) => slotNames.includes(slotName)))
  }

  getComponentsForSlot(): Observable<never[]> {
    return of([])
  }
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
        { provide: SlotService, useClass: SlotServiceStub },
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

  describe('landmarks', () => {
    const slotService = () => TestBed.inject(SlotService) as unknown as SlotServiceStub

    const createLandmarkFixture = () => {
      const noProfile = null
      const noFavicon = of(undefined)
      const defaultWorkspaceConfig = undefined
      const emitTheme = false
      return createFixture({ name: 'theme' }, noProfile, noFavicon, defaultWorkspaceConfig, emitTheme)
    }

    const renderWithSlots = (slotsWithContent: string[]) => {
      const fixtureData = createLandmarkFixture()
      slotService().slotsWithContent$.next(slotsWithContent)
      const translate = TestBed.inject(TranslateService)
      translate.setTranslation('en', { SHELL_LANDMARKS: { MAIN_NAVIGATION: 'Main navigation' } })
      translate.use('en')
      fixtureData.fixture.detectChanges()
      fixtureData.currentTheme$.next({ name: 'theme' })
      fixtureData.fixture.detectChanges()
      return { ...fixtureData, element: fixtureData.fixture.nativeElement as HTMLElement }
    }

    const query = (element: HTMLElement, selector: string) => element.querySelector(selector) as HTMLElement

    // A <header> outside of sectioning content is an implicit banner unless its role is overridden
    const expectBanner = (element: HTMLElement) => {
      const headers = element.querySelectorAll('header')
      expect(headers).toHaveLength(1)
      expect(headers[0].hasAttribute('role')).toBe(false)
    }

    const expectNoBanner = (element: HTMLElement) => {
      expect(query(element, 'header').getAttribute('role')).toBe('none')
    }

    it('exposes one banner, a named navigation and the body footer as the only contentinfo on a standard workspace', () => {
      const { fixture, element } = renderWithSlots([
        'onecx-shell-header.start',
        'onecx-shell-body-start.start',
        'onecx-shell-body-footer.start'
      ])

      expectBanner(element)
      const navigation = element.querySelectorAll('[role="navigation"]')
      expect(navigation).toHaveLength(1)
      expect(navigation[0].getAttribute('name')).toBe('onecx-shell-body-start')
      expect(navigation[0].getAttribute('aria-label')).toBe('Main navigation')
      const contentInfo = element.querySelectorAll('[role="contentinfo"], footer')
      expect(contentInfo).toHaveLength(1)
      expect(contentInfo[0].getAttribute('name')).toBe('onecx-shell-body-footer')
      fixture.destroy()
    })

    it.each(['onecx-shell-header.center', 'onecx-shell-header.end'])(
      'exposes the header as banner when only %s has content',
      (slot) => {
        const { fixture, element } = renderWithSlots([slot])

        expectBanner(element)
        fixture.destroy()
      }
    )

    it('does not expose the header as banner when only other slot groups have content', () => {
      const { fixture, element } = renderWithSlots(['onecx-shell-body-start.center', 'onecx-shell-footer.end'])

      expectNoBanner(element)
      fixture.destroy()
    })

    it('exposes the banner together with the navigation', () => {
      const { fixture, element } = renderWithSlots(['onecx-shell-header.end', 'onecx-shell-body-start.center'])

      expectBanner(element)
      expect(element.querySelectorAll('[role="navigation"]')).toHaveLength(1)
      expect(query(element, 'header').contains(query(element, '[role="navigation"]'))).toBe(false)
      fixture.destroy()
    })

    it('does not expose the hard-coded region "Start"', () => {
      const { fixture, element } = renderWithSlots(['onecx-shell-header.center'])

      expect(element.querySelector('section')).toBeNull()
      expect(element.querySelector('[aria-label="Start"]')).toBeNull()
      fixture.destroy()
    })

    it('does not expose empty landmarks and does not display the footer without content', () => {
      const { fixture, element } = renderWithSlots([])

      expectNoBanner(element)
      expect(element.querySelector('[role="navigation"]')).toBeNull()
      expect(element.querySelector('[aria-label]')).toBeNull()
      expect(element.querySelector('[role="contentinfo"]')).toBeNull()
      expect(element.querySelector('footer')).toBeNull()
      fixture.destroy()
    })

    it('uses the footer slot group as the only contentinfo when it has content', () => {
      const { fixture, element } = renderWithSlots(['onecx-shell-footer.end', 'onecx-shell-body-footer.start'])

      expect(element.querySelectorAll('footer')).toHaveLength(1)
      expect(query(element, 'footer').querySelector('[name="onecx-shell-footer"]')).not.toBeNull()
      expect(element.querySelector('[role="contentinfo"]')).toBeNull()
      fixture.destroy()
    })

    it('keeps exactly one main landmark alongside the banner, navigation and contentinfo', () => {
      const { fixture, element } = renderWithSlots([
        'onecx-shell-header.start',
        'onecx-shell-body-start.start',
        'onecx-shell-body-footer.start'
      ])

      const main = element.querySelectorAll('main, [role="main"]')
      expect(main).toHaveLength(1)
      expect(main[0].id).toBe('ocx_main_content')
      expectBanner(element)
      expect(element.querySelectorAll('[role="navigation"]')).toHaveLength(1)
      expect(element.querySelectorAll('[role="contentinfo"], footer')).toHaveLength(1)
      expect(main[0].contains(query(element, '[role="navigation"]'))).toBe(false)
      expect(main[0].contains(query(element, '[role="contentinfo"]'))).toBe(false)
      fixture.destroy()
    })

    it('adds the landmarks when slot content appears', () => {
      const { fixture, element } = renderWithSlots([])
      slotService().slotsWithContent$.next([
        'onecx-shell-header.center',
        'onecx-shell-body-start.end',
        'onecx-shell-body-footer.start'
      ])
      fixture.detectChanges()

      expectBanner(element)
      expect(query(element, '[role="navigation"]').getAttribute('aria-label')).toBe('Main navigation')
      expect(element.querySelectorAll('[role="contentinfo"]')).toHaveLength(1)
      fixture.destroy()
    })

    it('removes the landmarks again when slot content disappears', () => {
      const { fixture, element } = renderWithSlots([
        'onecx-shell-header.center',
        'onecx-shell-body-start.end',
        'onecx-shell-body-footer.start'
      ])
      slotService().slotsWithContent$.next([])
      fixture.detectChanges()

      expectNoBanner(element)
      expect(element.querySelector('[role="navigation"]')).toBeNull()
      expect(element.querySelector('[aria-label="Main navigation"]')).toBeNull()
      expect(element.querySelector('[role="contentinfo"]')).toBeNull()
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
})
