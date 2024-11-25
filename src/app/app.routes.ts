import { Route } from '@angular/router'
import { InitializationErrorPageComponent } from './shell/components/initialization-error-page/initialization-error-page.component'
import { ErrorPageComponent } from './shell/components/error-page.component'

export const appRoutes: Route[] = [
  {
    path: 'portal-initialization-error-page',
    data: { message: '' },
    component: InitializationErrorPageComponent,
    title: 'Initialization Error'
  },
  {
    path: 'remote-loading-error-page',
    data: { requestedApplicationPath: '' },
    component: ErrorPageComponent,
    title: 'Error'
  }
]
