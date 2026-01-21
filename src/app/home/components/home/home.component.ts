import { Component, inject } from '@angular/core'
import { map, Observable } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'
import { CommonModule } from '@angular/common'
import { TranslateModule } from '@ngx-translate/core'
import { WelcomeMessageComponent } from '../welcome-message-component/welcome-message.component'
import { Workspace } from '@onecx/integration-interface'

@Component({
  standalone: true,
  selector: 'ocx-shell-home',
  imports: [CommonModule, TranslateModule, WelcomeMessageComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  workspace$: Observable<Workspace | undefined>

  private readonly appStateService: AppStateService = inject(AppStateService)

  constructor() {
    this.workspace$ = this.appStateService.currentWorkspace$.pipe(map((currentWorkspace) => currentWorkspace))
  }
}
