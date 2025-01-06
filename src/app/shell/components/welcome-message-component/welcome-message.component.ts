import { Component } from '@angular/core'

import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { CurrentWorkspaceTopic, UserProfileTopic } from '@onecx/integration-interface'

@Component({
  selector: 'ocx-shell-welcome-message',
  templateUrl: './welcome-message.component.html'
})
export class WelcomeMessageComponent {
  user$: UserProfileTopic
  currentDate = new Date()
  workspace$: CurrentWorkspaceTopic

  constructor(
    private readonly userService: UserService,
    private readonly appStateService: AppStateService
  ) {
    this.user$ = this.userService.profile$
    this.workspace$ = this.appStateService.currentWorkspace$
  }
}
