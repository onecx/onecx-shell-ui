import { Component } from '@angular/core';
import { AppStateService } from '@onecx/angular-integration-interface';
import { Workspace } from '@onecx/integration-interface';
import { map, Observable } from 'rxjs';
@Component({
  selector: 'ocx-shell-home',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  workspace$: Observable<Workspace | undefined>;

  constructor(private appStateService: AppStateService) {
    this.workspace$ = this.appStateService.currentWorkspace$.pipe(
      map((currentWorkspace) => currentWorkspace)
    );
  }
}
