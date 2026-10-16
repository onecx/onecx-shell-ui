import { TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'

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
