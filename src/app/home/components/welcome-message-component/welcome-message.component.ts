import { Component, inject } from '@angular/core'

import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { CurrentWorkspaceTopic, UserProfileTopic } from '@onecx/integration-interface'
import { CommonModule } from '@angular/common'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  standalone: true,
  selector: 'ocx-shell-welcome-message',
  imports: [CommonModule, TranslateModule],
  templateUrl: './welcome-message.component.html'
})
export class WelcomeMessageComponent {
  user$: UserProfileTopic
  workspace$: CurrentWorkspaceTopic

  private readonly userService: UserService = inject(UserService)
  private readonly appStateService: AppStateService = inject(AppStateService)

  constructor() {
    this.user$ = this.userService.profile$
    this.workspace$ = this.appStateService.currentWorkspace$
  }
}
