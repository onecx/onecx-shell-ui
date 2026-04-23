import { Route } from '@angular/router'

// Initialization error page is lazy-loaded via InitErrorModule
export const internalShellRoute = 'onecx-shell';

export const appRoutes: Route[] = [
  {
    path: 'portal-initialization-error-page',
    data: { message: '' },
    loadChildren: () => import('src/app/init-error/init-error.module').then((m) => m.InitErrorModule),
    title: 'Initialization Error'
  },
  {
    path: 'remote-loading-error-page',
    loadChildren: () => import('src/app/error/error.module').then((m) => m.ErrorModule),
    title: 'Error'
  },
  {
    path: `${internalShellRoute}/about-shell`,
    loadChildren: () => import('src/app/about/about.module').then((m) => m.AboutModule),
    title: 'About'
  }
]
