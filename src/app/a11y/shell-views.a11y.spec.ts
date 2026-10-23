import { AsyncPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { NO_ERRORS_SCHEMA, Provider } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter, RouterModule } from '@angular/router'
import { BehaviorSubject, of, ReplaySubject } from 'rxjs'

import { TranslateModule } from '@ngx-translate/core'
import { AppStateService, Theme, ThemeService, UserService } from '@onecx/angular-integration-interface'
import { provideTranslateTestingService } from '@onecx/angular-testing'

import { ErrorPageComponent } from '../error/components/error-page/error-page.component'
import { HomeComponent } from '../home/components/home/home.component'
import { InitializationErrorPageComponent } from '../init-error/components/initialization-error-page/initialization-error-page.component'
import { PageNotFoundComponent } from '../not-found/components/not-found-page/not-found-page.component'
import { AppLoadingSpinnerComponent } from '../shell/components/app-loading-spinner/app-loading-spinner.component'
import { GlobalErrorComponent } from '../shell/components/error-component/global-error.component'
import { PortalViewportComponent } from '../shell/components/portal-viewport/portal-viewport.component'
import { RoutesService } from '../shell/services/routes.service'
import { WorkspaceConfigBffService } from 'src/app/shared/generated/api/workspaceConfig.service'
import { expectNoA11yViolations } from './axe-helper'

/**
 * Renders the real templates of the shell views and runs axe on them, so regressions in accessible names,
 * landmarks and headings fail the unit tests. Remote slots (`ocx-slot`, `ocx-shell-slot-group`) and the
 * router outlet content are not rendered in unit tests; the surrounding shell markup is.
 */
jest.setTimeout(60000)

describe('Shell views accessibility (axe)', () => {
  let fixture: ComponentFixture<unknown> | undefined

  afterEach(() => {
    // destroyAfterEach is disabled in this project, so remove the host element explicitly
    // to keep each test's DOM independent of the test order
    fixture?.destroy()
    ;(fixture?.nativeElement as HTMLElement | undefined)?.remove()
    fixture = undefined
  })

  /** jsdom reports `page-has-heading-one` as incomplete, so the heading is asserted directly */
  function expectSingleH1(element: HTMLElement): void {
    const headings = element.querySelectorAll('h1')
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent?.trim()).not.toBe('')
  }

  async function render<T>(component: new () => T, providers: Provider[] = []): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [component],
      providers: [provideTranslateTestingService({}), provideRouter([]), ...providers]
    }).compileComponents()
    fixture = TestBed.createComponent(component)
    fixture.detectChanges()
    await fixture.whenStable()
    return fixture.nativeElement as HTMLElement
  }

  const workspace$ = new BehaviorSubject({
    baseUrl: '/home',
    workspaceName: 'Workspace',
    portalName: 'Portal',
    microfrontendRegistrations: []
  })
  const appStateService = {
    currentMfe$: { publish: jest.fn() },
    currentWorkspace$: workspace$,
    globalError$: new BehaviorSubject<string | undefined>(undefined)
  }

  it('portal viewport has no violations and renders header and footer landmarks', async () => {
    Object.assign(globalThis, {
      ResizeObserver: class {
        observe = jest.fn()
        unobserve = jest.fn()
        disconnect = jest.fn()
      }
    })
    const workspaceConfig = { getThemeFaviconByName: () => of() }
    const currentTheme$ = new ReplaySubject<Theme>(1)
    await TestBed.configureTestingModule({
      imports: [PortalViewportComponent],
      providers: [
        provideTranslateTestingService({}),
        provideRouter([]),
        { provide: AppStateService, useValue: appStateService },
        { provide: UserService, useValue: { profile$: of(null) } },
        { provide: ThemeService, useValue: { currentTheme$ } },
        { provide: HttpClient, useValue: { get: () => of() } },
        { provide: RoutesService, useValue: { showContent$: of(true) } },
        { provide: WorkspaceConfigBffService, useValue: workspaceConfig }
      ]
    })
      // slot groups load remote components, which are out of scope for unit tests
      .overrideComponent(PortalViewportComponent, {
        set: {
          imports: [AsyncPipe, RouterModule, TranslateModule, GlobalErrorComponent, AppLoadingSpinnerComponent],
          schemas: [NO_ERRORS_SCHEMA]
        }
      })
      .compileComponents()
    // a favicon url makes the component use the mocked HttpClient instead of the generated BFF service
    currentTheme$.next({ name: 'theme', faviconUrl: '/favicon' })
    fixture = TestBed.createComponent(PortalViewportComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    const element = fixture.nativeElement as HTMLElement

    expect(element.querySelector('header')).not.toBeNull()
    expect(element.querySelector('footer')).not.toBeNull()
    // axe cannot decide `landmark-one-main` without layout (reports it as incomplete in jsdom), so assert it here
    expect(element.querySelectorAll('main, [role="main"]')).toHaveLength(1)
    // page level rule `region`: all content must be inside landmarks
    await expectNoA11yViolations(element, { pageLevel: true })
  })

  it('global error view has no violations', async () => {
    const element = await render(GlobalErrorComponent, [
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } }
    ])
    expectSingleH1(element)
    await expectNoA11yViolations(element)
  })

  // The spinner is purely visual markup without text, role or label, so axe has nothing to check here;
  // this only guards against introducing invalid markup. It does not verify that loading is announced.
  it('loading spinner markup has no violations', async () => {
    await expectNoA11yViolations(await render(AppLoadingSpinnerComponent))
  })

  it('404 page has no violations', async () => {
    const element = await render(PageNotFoundComponent, [{ provide: AppStateService, useValue: appStateService }])
    expect(element.querySelector('button')).not.toBeNull()
    expectSingleH1(element)
    await expectNoA11yViolations(element)
  })

  it('initialization error page has no violations', async () => {
    const fragment = new URLSearchParams({ message: 'Failed', requestedUrl: 'http://example.com' }).toString()
    const element = await render(InitializationErrorPageComponent, [
      { provide: ActivatedRoute, useValue: { fragment: of(fragment) } }
    ])
    expectSingleH1(element)
    await expectNoA11yViolations(element)
  })

  it('home view has no violations', async () => {
    const element = await render(HomeComponent, [{ provide: AppStateService, useValue: appStateService }])
    await expectNoA11yViolations(element)
  })

  it('generic error page has no violations', async () => {
    const element = await render(ErrorPageComponent, [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'some/path' } } } }
    ])
    expectSingleH1(element)
    await expectNoA11yViolations(element)
  })
})
