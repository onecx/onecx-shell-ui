import { TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'
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
