import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { AppStateService, Theme, ThemeService, UserService } from '@onecx/angular-integration-interface'
import { UserProfile } from '@onecx/integration-interface'
import { WorkspaceConfigBffService } from 'src/app/shared/generated/api/workspaceConfig.service'
import { BehaviorSubject, Observable, of, Subject } from 'rxjs'
import { RoutesService } from '../../services/routes.service'
import { PortalViewportComponent } from './portal-viewport.component'

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
      imports: [PortalViewportComponent],
      providers: [
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
})
