import { Injectable } from '@angular/core';
import { Route, Router } from '@angular/router';
import {
  AngularRouteTypeEnum,
  GetRoutesByUrlResponseRoutesInner,
  RoutesBffService,
  WebComponentRoute,
} from '../generated';
import { firstValueFrom, retry } from 'rxjs';
import { appRoutes } from 'src/app/app.routes';
import {
  LoadRemoteModuleOptions,
  loadRemoteModule,
} from '@angular-architects/module-federation';
import { AppStateService, CONFIG_KEY, ConfigurationService, PortalMessageService } from '@onecx/portal-integration-angular';

export const DEFAULT_CATCH_ALL_ROUTE: Route = {}; //{ path: '**', component: ErrorPageComponent }

@Injectable({ providedIn: 'root' })
export class RoutesService {
  constructor(
    private router: Router,
    private routesBffService: RoutesBffService,
    private appStateService: AppStateService,
    private portalMessageService: PortalMessageService,
    private configurationService: ConfigurationService
  ) {}

  async init(): Promise<unknown> {
    const getRoutesByUrlResponse = await firstValueFrom(
      this.routesBffService.getRoutesByUrl(window.location.href).pipe(retry(1))
    );
    const routes = getRoutesByUrlResponse.routes;

    this.router.resetConfig([
      ...appRoutes,
      ...routes
        .map((r) => this.convertToRoute(r))
        .sort((a, b) => (b.path || '')?.length - (a.path || '')?.length),
      // DEFAULT_CATCH_ALL_ROUTE,
    ]);
    console.log(
      `🧭 Adding App routes: \n${routes.map((lr) => `${lr.remoteBaseUrl} -> ${JSON.stringify(lr.url)}`).join('\t\n')}`
    )
    return Promise.resolve();
  }

  private convertToRoute(r: GetRoutesByUrlResponseRoutesInner): Route {
    return {
      path: this.toRouteUrl(r.url),
      data: {
        module: r.exposedModule,
        breadcrumb: r.displayName,
      },
      pathMatch: r.pathMatch ?? r.url.endsWith('$') ? 'full' : 'prefix',
      loadChildren: async () => await this.loadChildren(r),
      canActivateChild: [() => this.updateMfeInfo(r)],
    };
  }

  private async loadChildren(r: GetRoutesByUrlResponseRoutesInner) {
    await this.appStateService.globalLoading$.publish(true)
    console.log(`➡ Load remote module ${r.exposedModule}`);
    try {
      try {
        const m = await loadRemoteModule(this.toLoadRemoteEntryOptions(r));
        console.log(`Load remote module ${r.exposedModule} finished`);
        this.updateMfeInfo(r)
        return m[r.exposedModule];
      } catch (err) {
        return this.onRemoteLoadError(err)
      }
    } finally {
      this.appStateService.globalLoading$.publish(false)
    }
  }

  private updateMfeInfo(r: GetRoutesByUrlResponseRoutesInner) {
    const mfeInfo = {
      baseHref: r.url,
      mountPath: r.url,
      shellName: 'portal',
      remoteBaseUrl: r.remoteBaseUrl,
      version: r.appVersion,
      displayName: r.displayName,
    }
    this.appStateService.currentMfe$.publish(mfeInfo)
  }

  private onRemoteLoadError(err: unknown) {
    console.log(`Failed to load remote module: ${err}`)
    this.portalMessageService.error({
      summaryKey: 'MESSAGE.ON_REMOTE_LOAD_ERROR',
    })
    throw err
  }

  private toLoadRemoteEntryOptions(
    r: GetRoutesByUrlResponseRoutesInner
  ): LoadRemoteModuleOptions {
    if (r.type === AngularRouteTypeEnum.Angular) {
      return {
        type: 'module',
        remoteEntry: r.remoteEntry,
        exposedModule: './' + r.exposedModule,
      };
    }
    return {
        type: 'script',
        remoteName: (r as WebComponentRoute).remoteName,
        remoteEntry: r.remoteEntry,
        exposedModule: './' + r.exposedModule,
      };
  }

  private toRouteUrl(url: string | undefined) {
    if (!url) {
      return url;
    }
    const SHELL_BASE_HREF = this.configurationService.getProperty(CONFIG_KEY.APP_BASE_HREF);
    if (SHELL_BASE_HREF && url.startsWith(SHELL_BASE_HREF)) {
      url = url.slice(SHELL_BASE_HREF.length);
    }

    if (url?.startsWith('/')) {
      url = url.substring(1);
    }
    if (url.endsWith('$')) {
      url = url.substring(0, url.length - 1);
    }
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }
}
