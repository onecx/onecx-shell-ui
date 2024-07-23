import {
  LoadRemoteModuleOptions,
  loadRemoteModule,
} from '@angular-architects/module-federation';
import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import {
  NavigationEnd,
  NavigationSkipped,
  Route,
  Router,
} from '@angular/router';
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
import { BehaviorSubject, filter, firstValueFrom, map, tap } from 'rxjs';
import { appRoutes } from 'src/app/app.routes';
import {
  PathMatch,
  PermissionBffService,
  Technologies,
} from 'src/app/shared/generated';
import { Route as BffGeneratedRoute } from '../../shared/generated';
import { ErrorPageComponent } from '../components/error-page.component';
import { HomeComponent } from '../components/home/home.component';
import { WebcomponentLoaderModule } from '../web-component-loader/webcomponent-loader.module';

export const DEFAULT_CATCH_ALL_ROUTE: Route = {
  path: '**',
  component: ErrorPageComponent,
  title: 'Error',
};

@Injectable({ providedIn: 'root' })
export class RoutesService implements ShowContentProvider {
  private permissionsTopic$ = new PermissionsTopic();
  private isFirstLoad = true;
  private isHomePageLoaded = false;
  private resolveIsInitialized:
    | ((value: void | PromiseLike<void>) => void)
    | undefined;
  showContent$ = new BehaviorSubject<boolean>(true);
  isInitialized = new Promise<void>(
    (resolve) => (this.resolveIsInitialized = resolve)
  );

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
        tap((e) => console.log(e)),
        filter(
          (e): e is NavigationEnd =>
            e instanceof NavigationEnd || e instanceof NavigationSkipped
        ),
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
    this.resolveIsInitialized ? this.resolveIsInitialized() : undefined;
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
        if (await this.isHomePage(r)) {
          this.isHomePageLoaded = true;
        }
        if (r.technology === Technologies.Angular) {
          return m[exposedModule];
        } else {
          return WebcomponentLoaderModule;
        }
      } catch (err) {
        await this.ensureHomePageAvailability(r);
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
      remoteName: r.remoteName,
      elementName: r.elementName,
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

    const currentBaseUrl = (
      await firstValueFrom(
        this.appStateService.currentWorkspace$.asObservable()
      )
    ).baseUrl;

    const fallBackRoute = this.router.config.find(
      (r) => r.path === this.toRouteUrl(currentBaseUrl)
    );
    if (fallBackRoute?.redirectTo && this.isHomePageLoaded) {
      const homePageUrl = await this.getHomePageUrl();
      const homeRoute = this.router.config.find((r) => r.path === homePageUrl);
      if (homeRoute && homeRoute.canActivateChild) {
        for (const canActivateCallback of homeRoute.canActivateChild)
          await canActivateCallback();
      }
    }

    this.router.navigate([currentBaseUrl]);
    throw err;
  }

  private async ensureHomePageAvailability(r: BffGeneratedRoute) {
    if (!(await this.isHomePage(r))) return;

    const baseUrl = (
      await firstValueFrom(
        this.appStateService.currentWorkspace$.asObservable()
      )
    ).baseUrl;

    const routes = this.router.config;
    const fallBackRoute = routes.find(
      (r) => r.path === this.toRouteUrl(baseUrl)
    );
    if (fallBackRoute?.redirectTo) {
      fallBackRoute.redirectTo = undefined;
      fallBackRoute.component = HomeComponent;
    }
    this.router.resetConfig(routes);
  }

  private async isHomePage(r: BffGeneratedRoute): Promise<boolean> {
    const homePageUrl = await this.getHomePageUrl();
    return (
      homePageUrl !== undefined && this.toRouteUrl(r.baseUrl) === homePageUrl
    );
  }

  private async getHomePageUrl(): Promise<string | undefined> {
    const currentWorkspace = await firstValueFrom(
      this.appStateService.currentWorkspace$.asObservable()
    );
    return (
      currentWorkspace.homePage &&
      this.createHomePageUrl(
        currentWorkspace.baseUrl,
        currentWorkspace.homePage
      )
    );
  }

  private toLoadRemoteEntryOptions(
    r: BffGeneratedRoute
  ): LoadRemoteModuleOptions {
    const exposedModule = r.exposedModule.startsWith('./')
      ? r.exposedModule.slice(2)
      : r.exposedModule;
    if (
      r.technology === Technologies.Angular ||
      r.technology === Technologies.WebComponentModule
    ) {
      return {
        type: 'module',
        remoteEntry: r.remoteEntryUrl,
        exposedModule: './' + exposedModule,
      };
    }
    return {
      type: 'script',
      remoteName: r.remoteName ?? '',
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
    const currentWorkspace = await firstValueFrom(
      this.appStateService.currentWorkspace$.asObservable()
    );
    const route = {
      path: this.toRouteUrl(currentWorkspace.baseUrl),
      pathMatch: PathMatch.full,
    };

    if (currentWorkspace.homePage === undefined) {
      return {
        ...route,
        component: HomeComponent,
      };
    }
    return {
      ...route,
      redirectTo: this.createHomePageUrl(
        currentWorkspace.baseUrl,
        currentWorkspace.homePage
      ),
    };
  }

  private createHomePageUrl(baseUrl: string, homePage: string) {
    return this.toRouteUrl(Location.joinWithSlash(baseUrl, homePage));
  }
}
