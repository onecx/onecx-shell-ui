import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Subject } from 'rxjs'

import { provideTranslateTestingService } from '@onecx/angular-testing'

import { AppStateService } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'
import { PageNotFoundComponent } from './not-found-page.component'

describe('PageNotFoundComponent', () => {
  it('publishes an empty current microfrontend and exposes workspace updates', () => {
    const currentWorkspace$ = new Subject<Workspace>()
    const publish = jest.fn()
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AppStateService,
          useValue: { currentMfe$: { publish }, currentWorkspace$ }
        }
      ]
    })

    const component = TestBed.runInInjectionContext(() => new PageNotFoundComponent())
    const next = jest.fn()
    component.workspace$.subscribe(next)
    const workspace: Workspace = {
      baseUrl: '/home',
      workspaceName: 'Workspace',
      portalName: 'Portal',
      microfrontendRegistrations: []
    }
    currentWorkspace$.next(workspace)

    expect(publish).toHaveBeenCalledWith({
      appId: '',
      baseHref: '/',
      mountPath: '',
      remoteBaseUrl: '',
      shellName: 'portal',
      productName: ''
    })
    expect(next).toHaveBeenCalledWith(workspace)
  })
})

describe('PageNotFoundComponent template', () => {
  const workspace: Workspace = {
    baseUrl: '/admin',
    workspaceName: 'Workspace',
    portalName: 'Portal',
    microfrontendRegistrations: []
  }

  @Component({ standalone: true, template: '<h1>Workspace home</h1>' })
  class WorkspaceHomeStubComponent {}

  async function setup() {
    const currentWorkspace$ = new BehaviorSubject<Workspace>(workspace)
    TestBed.configureTestingModule({
      imports: [PageNotFoundComponent],
      providers: [
        provideRouter([
          { path: 'admin', component: WorkspaceHomeStubComponent },
          { path: '**', component: PageNotFoundComponent }
        ]),
        provideTranslateTestingService({ en: { NOT_FOUND_PAGE: { ACTION: 'Workspace Home' } } }),
        {
          provide: AppStateService,
          useValue: { currentMfe$: { publish: jest.fn() }, currentWorkspace$ }
        }
      ]
    })
    TestBed.inject(TranslateService).use('en')
    const harness = await RouterTestingHarness.create('/unknown-page')
    return { harness, router: TestBed.inject(Router) }
  }

  it('renders the workspace home action as a link named "Workspace Home"', async () => {
    const { harness } = await setup()
    const root = harness.routeNativeElement as HTMLElement

    const link = root.querySelector<HTMLAnchorElement>('a#onecxNotFoundPageAction')
    expect(root.querySelector('button')).toBeNull()
    expect(link).not.toBeNull()
    expect(link?.textContent?.trim()).toBe('Workspace Home')
    expect(link?.hasAttribute('aria-label')).toBe(false)
    expect(link?.getAttribute('href')).toBe('/admin')
  })

  it('navigates to the workspace home via the router without a reload', async () => {
    const { harness, router } = await setup()
    const navigateByUrl = jest.spyOn(router, 'navigateByUrl')
    const link = (harness.routeNativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a#onecxNotFoundPageAction'
    )
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })

    link?.dispatchEvent(click)
    await harness.fixture.whenStable()

    expect(click.defaultPrevented).toBe(true)
    expect(navigateByUrl).toHaveBeenCalled()
    expect(router.url).toBe('/admin')
  })
})
