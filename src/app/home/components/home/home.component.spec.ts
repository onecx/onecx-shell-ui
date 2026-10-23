import { TestBed } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { of, Subject } from 'rxjs'

import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { provideTranslateTestingService } from '@onecx/angular-testing'
import { Workspace } from '@onecx/integration-interface'

import { HomeComponent } from './home.component'

describe('HomeComponent', () => {
  it('exposes each current workspace value', () => {
    const currentWorkspace$ = new Subject<Workspace | undefined>()
    TestBed.configureTestingModule({
      providers: [{ provide: AppStateService, useValue: { currentWorkspace$ } }]
    })

    const component = TestBed.runInInjectionContext(() => new HomeComponent())
    const next = jest.fn()
    component.workspace$.subscribe(next)
    const workspace: Workspace = {
      baseUrl: '/workspace',
      workspaceName: 'Workspace',
      portalName: 'Portal',
      microfrontendRegistrations: []
    }
    currentWorkspace$.next(workspace)
    currentWorkspace$.next(undefined)

    expect(next).toHaveBeenNthCalledWith(1, workspace)
    expect(next).toHaveBeenNthCalledWith(2, undefined)
  })
})

describe('HomeComponent template', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideTranslateTestingService({ en: { WELCOME: { TITLE: 'Hello', WORKSPACE: 'Workspace:' } } }),
        { provide: UserService, useValue: { profile$: of({ person: { firstName: 'Ada' } }) } },
        { provide: AppStateService, useValue: { currentWorkspace$: of({ displayName: 'Admin Workspace' }) } }
      ]
    })
    TestBed.inject(TranslateService).use('en')
  })

  it('renders the welcome message as the single visible h1 of the page (page-has-heading-one)', () => {
    const fixture = TestBed.createComponent(HomeComponent)
    fixture.detectChanges()
    const element = fixture.nativeElement as HTMLElement
    const heading = element.querySelector('h1')

    expect(element.ownerDocument.querySelectorAll('h1')).toHaveLength(1)
    expect(heading?.textContent?.trim()).toBe('Hello Ada')
    expect(heading?.hidden).toBe(false)
    expect(heading?.getAttribute('aria-hidden')).toBeNull()
    expect(element.querySelector('#wc_overview_info_workspace')?.textContent?.trim()).toBe('Workspace: Admin Workspace')
  })
})
