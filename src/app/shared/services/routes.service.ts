import {
  LoadRemoteModuleOptions,
  loadRemoteModule,
} from '@angular-architects/module-federation';
import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { NavigationEnd, Route, Router } from '@angular/router';
import {
  AppStateService,
  CONFIG_KEY,
  ConfigurationService,
  PortalMessageService,
} from '@onecx/angular-integration-interface';
import { PermissionsTopic } from '@onecx/integration-interface';
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
    const generatedRoutes = routes.map((r) => this.convertToRoute(r));
    if (!(await this.containsRouteForWorkspace(routes))) {
      console.log(`Adding fallback route`);
      generatedRoutes.push(await this.createFallbackRoute());
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
      canActivateChild: [() => this.updateAppEnvironment(r, r.baseUrl)],
      title: r.displayName,
    };
  }

  private async loadChildren(r: BffGeneratedRoute, joinedBaseUrl: string) {
    this.showContent$.next(false);
    await this.appStateService.globalLoading$.publish(true);
    console.log(`➡ Load remote module ${r.exposedModule}`);
    try {
      try {
        await this.updateAppEnvironment(r, joinedBaseUrl);
        const m = await loadRemoteModule(this.toLoadRemoteEntryOptions(r));
        const exposedModule = r.exposedModule.startsWith('./')
          ? r.exposedModule.slice(2)
          : r.exposedModule;
        console.log(`Load remote module ${exposedModule} finished.`);
        return m[exposedModule];
      } catch (err) {
        return await this.onRemoteLoadError(err);
      }
    } finally {
      await this.appStateService.globalLoading$.publish(false);
    }
  }

  private async updateAppEnvironment(
    r: BffGeneratedRoute,
    joinedBaseUrl: string
  ): Promise<boolean> {
    this.updateAppStyles(r);
    return this.updateAppState(r, joinedBaseUrl);
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

  private async updateAppStyles(r: BffGeneratedRoute) {
    let link = document.getElementById('ocx_app_styles') as any;
    if (!link) {
      link = document.createElement('link');
      link.id = 'ocx_app_styles';
      link.rel = 'stylesheet';
      link.media = 'all';
      document.head.appendChild(link);
    }
    if (link.href !== Location.joinWithSlash(r.url, 'styles.css')) {
      link.href = Location.joinWithSlash(r.url, 'styles.css');
    }
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

  private async onRemoteLoadError(err: unknown) {
    console.log(`Failed to load remote module: ${err}`);
    this.portalMessageService.error({
      summaryKey: 'MESSAGE.ON_REMOTE_LOAD_ERROR',
    });
    this.router.navigate([
      (
        await firstValueFrom(
          this.appStateService.currentWorkspace$.asObservable()
        )
      ).baseUrl,
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
      remoteName: r.productName,
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

  private async containsRouteForWorkspace(
    routes: BffGeneratedRoute[]
  ): Promise<boolean> {
    const baseUrl = (
      await firstValueFrom(
        this.appStateService.currentWorkspace$.asObservable()
      )
    ).baseUrl;
    return (
      routes.find((r) => r.baseUrl === this.toRouteUrl(baseUrl)) !== undefined
    );
  }

  private async createFallbackRoute(): Promise<Route> {
    return {
      path: this.toRouteUrl(
        (
          await firstValueFrom(
            this.appStateService.currentWorkspace$.asObservable()
          )
        ).baseUrl
      ),
      component: HomeComponent,
      pathMatch: PathMatch.full,
    };
  }
}
