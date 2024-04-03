import { Component } from '@angular/core';
import { AppStateService, Portal } from '@onecx/portal-integration-angular';
import { map, Observable } from 'rxjs';
@Component({
  selector: 'ocx-shell-home',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  portal$: Observable<Portal | undefined>;

  constructor(private appStateService: AppStateService) {
    this.portal$ = this.appStateService.currentPortal$.pipe(
      map((currentPortal) => currentPortal)
    );
  }
}
