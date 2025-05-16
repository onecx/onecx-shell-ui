import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Observable, map } from 'rxjs'

import { EventsPublisher } from '@onecx/integration-interface'

interface InitializationError {
  message: string
  requestedUrl: string
  detail: string | null
  errorCode: string | null
  params: string | null
  invalidParams: string | null
}

@Component({
  templateUrl: './initialization-error-page.component.html'
})
export class InitializationErrorPageComponent {
  error$: Observable<InitializationError>
  public eventsPublisher$: EventsPublisher = new EventsPublisher()

  constructor(private readonly route: ActivatedRoute) {
    this.error$ = this.route.fragment.pipe(
      map((fragment) => {
        const params = new URLSearchParams(fragment ?? '')
        // console.log('fragment', fragment)
        // console.log('requestedUrl', params.get('requestedUrl'))
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
  /*
  http://localhost:5000/portal-initialization-error-page#
  message=Http+failure+response+for+http%253A%252F%252Flocalhost%253A5000%252Fshell-bff%252FworkspaceConfig%253A+404+Not+Found&requestedUrl=http%253A%252F%252Flocalhost%253A5000%252Fportal-initialization-error-page%2523
  
  message%253DHttp%252Bfailure%252Bresponse%252Bfor%252Bhttp%2525253A%2525252F%2525252Flocalhost%2525253A5000%2525252Fshell-bff%2525252FworkspaceConfig%2525253A%252B404%252BNot%252BFound%2526requestedUrl%253Dhttp%2525253A%2525252F%2525252Flocalhost%2525253A5000%2525252Fadmi%2526detail%253D%2526errorCode%253D%2526invalidParams%253D%2526params%253D&detail=&errorCode=&invalidParams=&params=
  */
  public onLogout(): void {
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
