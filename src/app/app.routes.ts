import { Route } from '@angular/router'

// Initialization error page is lazy-loaded via InitErrorModule
export const internalShellRoute = 'onecx-shell'

/** Route data key marking a shell route generated for a workspace microfrontend. */
export const MFE_ROUTE_DATA_KEY = 'isMfeRoute'

export const appRoutes: Route[] = [
  {
    path: 'portal-initialization-error-page',
    data: { message: '' },
    loadChildren: () => import('src/app/init-error/init-error.module').then((m) => m.InitErrorModule),
    title: 'PAGE_TITLES.INITIALIZATION_ERROR'
  },
  {
    path: 'remote-loading-error-page',
    loadChildren: () => import('src/app/error/error.module').then((m) => m.ErrorModule),
    title: 'PAGE_TITLES.ERROR'
  },
  {
    path: `${internalShellRoute}/about-shell`,
    loadChildren: () => import('src/app/about/about.module').then((m) => m.AboutModule),
    title: 'PAGE_TITLES.ABOUT'
  }
]
