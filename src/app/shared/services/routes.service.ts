import { Injectable } from '@angular/core';
import { Route, Router } from '@angular/router';
import {
  GetWorkspaceConfigResponseRoutesInner,
  UserBffService,
  WebComponentRoute,
} from '../generated';
import { appRoutes } from 'src/app/app.routes';
import {
  LoadRemoteModuleOptions,
  loadRemoteModule,
} from '@angular-architects/module-federation';
import {
  AppStateService,
  CONFIG_KEY,
  ConfigurationService,
  PortalMessageService,
} from '@onecx/portal-integration-angular';
import { GetRoutesByUrlResponseRoutesInner } from '../generated/model/getRoutesByUrlResponseRoutesInner';
import { ErrorPageComponent } from '../components/error-page.component';
import { PermissionsCacheService } from '@onecx/shell-core';
import { firstValueFrom, map } from 'rxjs';
import { PermissionsTopic } from '@onecx/integration-interface'

export const DEFAULT_CATCH_ALL_ROUTE: Route = {
  path: '**',
  component: ErrorPageComponent,
};

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private permissionsTopic$ = new PermissionsTopic()

  constructor(
    private router: Router,
    private appStateService: AppStateService,
    private portalMessageService: PortalMessageService,
    private configurationService: ConfigurationService,
    private permissionsCacheService: PermissionsCacheService,
    private userService: UserBffService
  ) {}

  async init(
    routes: GetWorkspaceConfigResponseRoutesInner[]
  ): Promise<unknown> {
    this.router.resetConfig([
      ...appRoutes,
      ...routes
        .map((r) => this.convertToRoute(r))
        .sort((a, b) => (b.path || '')?.length - (a.path || '')?.length),
      DEFAULT_CATCH_ALL_ROUTE,
    ]);
    console.log(
      `🧭 Adding App routes: \n${routes
        .map((lr) => `${lr.baseUrl} -> ${JSON.stringify(lr.url)}`)
        .join('\t\n')}`
    );
    return Promise.resolve();
  }

  private convertToRoute(r: GetRoutesByUrlResponseRoutesInner): Route {
    return {
      path: this.toRouteUrl(r.url),
      data: {
        module: r.exposedModule,
        breadcrumb: r.productName,
      },
      pathMatch: r.pathMatch ?? r.url.endsWith('$') ? 'full' : 'prefix',
      loadChildren: async () => await this.loadChildren(r),
      canActivateChild: [() => this.updateMfeInfo(r)],
    };
  }

  private async loadChildren(r: GetRoutesByUrlResponseRoutesInner) {
    await this.appStateService.globalLoading$.publish(true);
    console.log(`➡ Load remote module ${r.exposedModule}`);
    try {
      try {
        await this.updateMfeInfo(r);
        const permissions = await firstValueFrom(
          this.permissionsCacheService.getPermissions(
            r.appId,
            r.productName,
            (appId, productName) =>
              this.userService
                .getPermissions({ appId, productName })
                .pipe(map(({ permissions }) => permissions))
          )
        );
        await this.permissionsTopic$.publish(permissions)
        const m = await loadRemoteModule(this.toLoadRemoteEntryOptions(r));
        console.log(`Load remote module ${r.exposedModule} finished`);
        return m[r.exposedModule];
      } catch (err) {
        return this.onRemoteLoadError(err);
      }
    } finally {
      this.appStateService.globalLoading$.publish(false);
    }
  }

  private async updateMfeInfo(r: GetRoutesByUrlResponseRoutesInner) {
    const mfeInfo = {
      baseHref: r.url,
      mountPath: r.url,
      shellName: 'portal',
      remoteBaseUrl: r.baseUrl,
      displayName: r.productName,
      appId: r.appId,
      productName: r.productName
    };
    return await this.appStateService.currentMfe$.publish(mfeInfo);
  }

  private onRemoteLoadError(err: unknown) {
    console.log(`Failed to load remote module: ${err}`);
    this.portalMessageService.error({
      summaryKey: 'MESSAGE.ON_REMOTE_LOAD_ERROR',
    });
    throw err;
  }

  private toLoadRemoteEntryOptions(
    r: GetRoutesByUrlResponseRoutesInner
  ): LoadRemoteModuleOptions {
    if (r.technology === 'Angular') {
      return {
        type: 'module',
        remoteEntry: r.remoteEntryUrl,
        exposedModule: './' + r.exposedModule,
      };
    }
    return {
      type: 'script',
      remoteName: (r as WebComponentRoute).productName,
      remoteEntry: r.remoteEntryUrl,
      exposedModule: './' + r.exposedModule,
    };
  }

  private toRouteUrl(url: string | undefined) {
    if (!url) {
      return url;
    }
    const SHELL_BASE_HREF = this.configurationService.getProperty(
      CONFIG_KEY.APP_BASE_HREF
    );
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
