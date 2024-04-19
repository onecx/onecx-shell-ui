import {
  LoadRemoteModuleOptions,
  loadRemoteModule,
} from '@angular-architects/module-federation';
import { Injectable } from '@angular/core';
import { NavigationEnd, Route, Router } from '@angular/router';
import { PermissionsTopic } from '@onecx/integration-interface';
import {
  AppStateService,
  CONFIG_KEY,
  ConfigurationService,
  PortalMessageService,
} from '@onecx/portal-integration-angular';
import {
  PermissionsCacheService,
  ShowContentProvider,
} from '@onecx/shell-core';
import { BehaviorSubject, filter, firstValueFrom, map } from 'rxjs';
import { appRoutes } from 'src/app/app.routes';
import { ErrorPageComponent } from '../components/error-page.component';
import { HomeComponent } from '../components/home/home.component';
import { PathMatch, PermissionBffService } from '../generated';
import { Route as BffGeneratedRoute } from '../generated/model/route';
import { WebComponentRoute } from '../generated/model/webComponentRoute';

export const DEFAULT_CATCH_ALL_ROUTE: Route = {
  path: '**',
  component: ErrorPageComponent,
  title: 'Error',
};

@Injectable({ providedIn: 'root' })
export class RoutesService implements ShowContentProvider {
  private permissionsTopic$ = new PermissionsTopic();
  private isFirstLoad = true;
  showContent$ = new BehaviorSubject<boolean>(true);

  constructor(
    private router: Router,
    private appStateService: AppStateService,
    private portalMessageService: PortalMessageService,
    private configurationService: ConfigurationService,
    private permissionsCacheService: PermissionsCacheService,
    private permissionsService: PermissionBffService
  ) {
    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => true)
      )
      .subscribe(this.showContent$);
  }

  async init(routes: BffGeneratedRoute[]): Promise<unknown> {
    const workspaceBaseUrl =
      this.appStateService.currentWorkspace$.getValue()?.baseUrl;
    const generatedRoutes = routes.map((r) => this.convertToRoute(r));
    if (!this.containsRouteForWorkspace(routes)) {
      console.log(`Adding fallback route for base url ${workspaceBaseUrl}`);
      generatedRoutes.push(this.createFallbackRoute());
    }
    this.router.resetConfig([
      ...appRoutes,
      ...generatedRoutes.sort(
        (a, b) => (b.path || '')?.length - (a.path || '')?.length
      ),
      DEFAULT_CATCH_ALL_ROUTE,
    ]);
    console.log(
      `🧭 Adding App routes: \n${routes
        .map((lr) => `${lr.url} -> ${JSON.stringify(lr.baseUrl)}`)
        .join('\t\n')}`
    );
    return Promise.resolve();
  }

  private convertToRoute(r: BffGeneratedRoute): Route {
    return {
      path: this.toRouteUrl(r.baseUrl),
      data: {
        module: r.exposedModule,
        breadcrumb: r.productName,
      },
      pathMatch: r.pathMatch ?? (r.baseUrl.endsWith('$') ? 'full' : 'prefix'),
      loadChildren: async () => await this.loadChildren(r, r.baseUrl),
      canActivateChild: [() => this.updateAppState(r, r.baseUrl)],
      title: r.displayName,
    };
  }

  private async loadChildren(r: BffGeneratedRoute, joinedBaseUrl: string) {
    this.showContent$.next(false);
    await this.appStateService.globalLoading$.publish(true);
    console.log(`➡ Load remote module ${r.exposedModule}`);
    try {
      try {
        await this.updateAppState(r, joinedBaseUrl);
        const m = await loadRemoteModule(this.toLoadRemoteEntryOptions(r));
        const exposedModule = r.exposedModule.startsWith('./')
          ? r.exposedModule.slice(2)
          : r.exposedModule;
        console.log(`Load remote module ${exposedModule} finished.`);
        return m[exposedModule];
      } catch (err) {
        return this.onRemoteLoadError(err);
      }
    } finally {
      await this.appStateService.globalLoading$.publish(false);
    }
  }

  private async updateAppState(
    r: BffGeneratedRoute,
    joinedBaseUrl: string
  ): Promise<boolean> {
    const currentGlobalLoading = await firstValueFrom(
      this.appStateService.globalLoading$.asObservable()
    );
    const currentMfeInfo = !this.isFirstLoad
      ? await firstValueFrom(this.appStateService.currentMfe$.asObservable())
      : undefined;

    if (this.isFirstLoad || currentMfeInfo?.remoteBaseUrl !== r.url) {
      this.isFirstLoad = false;
      if (!currentGlobalLoading) {
        this.showContent$.next(false);
        await this.appStateService.globalLoading$.publish(true);
      }

      await Promise.all([
        this.updateMfeInfo(r, joinedBaseUrl),
        this.updatePermissions(r),
      ]);

      if (!currentGlobalLoading) {
        await this.appStateService.globalLoading$.publish(false);
      }
    }
    return true;
  }

  private async updateMfeInfo(r: BffGeneratedRoute, joinedBaseUrl: string) {
    const mfeInfo = {
      baseHref: joinedBaseUrl,
      mountPath: joinedBaseUrl,
      shellName: 'portal',
      remoteBaseUrl: r.url,
      displayName: r.displayName,
      appId: r.appId,
      productName: r.productName,
    };
    return await this.appStateService.currentMfe$.publish(mfeInfo);
  }

  private async updatePermissions(r: BffGeneratedRoute) {
    const permissions = await firstValueFrom(
      this.permissionsCacheService.getPermissions(
        r.appId,
        r.productName,
        (appId, productName) =>
          this.permissionsService
            .getPermissions({ appId, productName })
            .pipe(map(({ permissions }) => permissions))
      )
    );
    await this.permissionsTopic$.publish(permissions);
  }

  private onRemoteLoadError(err: unknown) {
    console.log(`Failed to load remote module: ${err}`);
    this.portalMessageService.error({
      summaryKey: 'MESSAGE.ON_REMOTE_LOAD_ERROR',
    });
    this.router.navigate([
      this.appStateService.currentWorkspace$.getValue()?.baseUrl,
    ]);
    throw err;
  }

  private toLoadRemoteEntryOptions(
    r: BffGeneratedRoute
  ): LoadRemoteModuleOptions {
    const exposedModule = r.exposedModule.startsWith('./')
      ? r.exposedModule.slice(2)
      : r.exposedModule;
    if (r.technology === 'Angular') {
      return {
        type: 'module',
        remoteEntry: r.remoteEntryUrl,
        exposedModule: './' + exposedModule,
      };
    }
    return {
      type: 'script',
      remoteName: (r as WebComponentRoute).productName,
      remoteEntry: r.remoteEntryUrl,
      exposedModule: './' + exposedModule,
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

  private containsRouteForWorkspace(routes: BffGeneratedRoute[]): boolean {
    return (
      routes.find(
        (r) =>
          r.baseUrl ===
          this.toRouteUrl(
            this.appStateService.currentWorkspace$.getValue()?.baseUrl
          )
      ) !== undefined
    );
  }

  private createFallbackRoute(): Route {
    return {
      path: this.toRouteUrl(
        this.appStateService.currentWorkspace$.getValue()?.baseUrl
      ),
      component: HomeComponent,
      pathMatch: PathMatch.full,
    };
  }
}
