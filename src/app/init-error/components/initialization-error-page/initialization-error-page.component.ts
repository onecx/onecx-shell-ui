import { Component, inject, OnDestroy } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Observable, map } from 'rxjs'
import { CommonModule } from '@angular/common'
import { TranslateModule } from '@ngx-translate/core'

import { EventsTopic } from '@onecx/integration-interface'

interface InitializationError {
  message: string
  requestedUrl: string
  detail: string | null
  errorCode: string | null
  params: string | null
  invalidParams: string | null
}

@Component({
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './initialization-error-page.component.html'
})
export class InitializationErrorPageComponent implements OnDestroy {
  error$: Observable<InitializationError>
  public eventsTopic: EventsTopic = new EventsTopic()

  private readonly route: ActivatedRoute = inject(ActivatedRoute)

  constructor() {
    this.error$ = this.route.fragment.pipe(
      map((fragment) => {
        const params = new URLSearchParams(fragment ?? '')
        return {
          message: params.get('message') ?? '',
          requestedUrl: params.get('requestedUrl') ?? '',
          detail: params.get('detail'),
          errorCode: params.get('errorCode'),
          params: params.get('params'),
          invalidParams: params.get('invalidParams')
        }
      })
    )
  }

  ngOnDestroy(): void {
    this.eventsTopic.destroy()
  }

  public onLogout(): void {
    this.eventsTopic.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
