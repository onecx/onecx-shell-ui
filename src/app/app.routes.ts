import { Route } from '@angular/router';
import { InitializationErrorPageComponent } from './shared/components/initialization-error-page/initialization-error-page.component';

export const appRoutes: Route[] = [
  {
    path: 'portal-initialization-error-page',
    data: {
      message: '',
    },
    component: InitializationErrorPageComponent,
    title: 'Initialization Error',
  },
];
