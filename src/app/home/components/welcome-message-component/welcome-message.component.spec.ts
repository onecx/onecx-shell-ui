import { TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'

import { AppStateService, UserService } from '@onecx/angular-integration-interface'

import { WelcomeMessageComponent } from './welcome-message.component'

describe('WelcomeMessageComponent', () => {
  it('exposes the user profile and current workspace streams', () => {
    const profile$ = new Subject()
    const currentWorkspace$ = new Subject()
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { profile$ } },
        { provide: AppStateService, useValue: { currentWorkspace$ } }
      ]
    })

    const component = TestBed.runInInjectionContext(() => new WelcomeMessageComponent())
    const userNext = jest.fn()
    const workspaceNext = jest.fn()
    component.user$.subscribe(userNext)
    component.workspace$.subscribe(workspaceNext)
    profile$.next({ userName: 'user' })
    currentWorkspace$.next({ name: 'Workspace' })

    expect(userNext).toHaveBeenCalledWith({ userName: 'user' })
    expect(workspaceNext).toHaveBeenCalledWith({ name: 'Workspace' })
  })
})
