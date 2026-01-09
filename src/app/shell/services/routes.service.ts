import { Injectable } from '@angular/core'
import { Location } from '@angular/common'
import { NavigationEnd, NavigationSkipped, Route, Router } from '@angular/router'
import { BehaviorSubject, filter, firstValueFrom, map } from 'rxjs'

import { getLocation } from '@onecx/accelerator'
import {
  AppStateService,
  CONFIG_KEY,
  ConfigurationService,
  PortalMessageService
} from '@onecx/angular-integration-interface'
import { PermissionsTopic } from '@onecx/integration-interface'

import { appRoutes } from 'src/app/app.routes'
import { Route as BffGeneratedRoute, PathMatch, PermissionBffService, Technologies } from 'src/app/shared/generated'

import { WebcomponentLoaderModule } from '../web-component-loader/webcomponent-loader.module'
import { updateStylesForMfeChange } from '@onecx/angular-utils/style'
import { HttpClient } from '@angular/common/http'
import { types } from '@module-federation/runtime-core'
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime'
import { PermissionsCacheService } from './permissions-cache.service'

export const DEFAULT_CATCH_ALL_ROUTE: Route = {
  path: '**',
  loadChildren: () => import('src/app/not-found/not-found.module').then((m) => m.NotFoundModule),
  title: 'OneCX Error'
}

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly permissionsTopic$ = new PermissionsTopic()
  private isFirstLoad = true
  showContent$ = new BehaviorSubject<boolean>(true)

  constructor(
    private readonly router: Router,
    private readonly appStateService: AppStateService,
    private readonly portalMessageService: PortalMessageService,
    private readonly configurationService: ConfigurationService,
    private readonly permissionsCacheService: PermissionsCacheService,
    private readonly permissionsService: PermissionBffService,
    private readonly httpClient: HttpClient
  ) {
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd || e instanceof NavigationSkipped),
        map(() => true)
      )
      .subscribe(this.showContent$)
  }

  async init(routes: BffGeneratedRoute[]): Promise<void> {
    routes.sort(this.sortRoutes)
    const generatedRoutes = await Promise.all(routes.map((r) => this.convertToRoute(r)))
    if (!(await this.containsRouteForWorkspace(routes))) {
      console.log('🧭 Adding fallback route')
      generatedRoutes.push(await this.createFallbackRoute())
    }
    this.router.resetConfig([...appRoutes, ...generatedRoutes, DEFAULT_CATCH_ALL_ROUTE])
    console.log('🧭 Adding Workspace routes:\n' + this.listRoutes(routes))
  }

  private listRoutes(routes: BffGeneratedRoute[]): string {
    return routes.map((lr) => `\t${lr.url} -> ${JSON.stringify(lr.baseUrl)}`).join('\n')
  }

  private sortRoutes(a: BffGeneratedRoute, b: BffGeneratedRoute): number {
    return (b.url ?? '').length - (a.url ?? '').length
  }

  private async convertToRoute(r: BffGeneratedRoute): Promise<Route> {
    return {
      path: await this.toRouteUrl(r.baseUrl),
      data: {
        module: r.exposedModule,
        breadcrumb: r.productName
      },
      pathMatch: r.pathMatch ?? (r.baseUrl.endsWith('$') ? 'full' : 'prefix'),
      loadChildren: async () => await this.loadChildren(r, r.baseUrl),
      canActivateChild: [() => this.updateAppEnvironment(r, r.baseUrl)],
      title: r.displayName
    }
  }

  private async loadChildren(r: BffGeneratedRoute, joinedBaseUrl: string) {
    this.showContent$.next(false)
    await this.appStateService.globalLoading$.publish(true)
    console.log(`➡ Load remote module ${r.exposedModule}`)
    try {
      try {
        await this.updateAppEnvironment(r, joinedBaseUrl)
        registerRemotes([this.toLoadRemoteEntryOptions(r)])
        const exposedModule = r.exposedModule.startsWith('./') ? r.exposedModule.slice(2) : r.exposedModule
        const m = await loadRemote<any>(r.productName + '/' + r.appId + '/' + exposedModule)
        console.log(`Load remote module ${exposedModule} finished.`)
        if (r.technology === Technologies.Angular) {
          return m[exposedModule]
        } else {
          return WebcomponentLoaderModule
        }
      } catch (err) {
        return await this.onRemoteLoadError(err)
      }
    } finally {
      await this.appStateService.globalLoading$.publish(false)
    }
  }

  private async updateAppEnvironment(r: BffGeneratedRoute, joinedBaseUrl: string): Promise<boolean> {
    this.updateAppStyles(r)
    return this.updateAppState(r, joinedBaseUrl)
  }

  private async updateAppState(r: BffGeneratedRoute, joinedBaseUrl: string): Promise<boolean> {
    const currentGlobalLoading = await firstValueFrom(this.appStateService.globalLoading$.asObservable())
    let currentMfeInfo: { remoteBaseUrl?: string } | undefined
    if (!this.isFirstLoad) {
      currentMfeInfo = await firstValueFrom(this.appStateService.currentMfe$.asObservable())
    }

    if (this.isFirstLoad || (currentMfeInfo?.remoteBaseUrl ?? undefined) !== r.url) {
      this.isFirstLoad = false
      if (!currentGlobalLoading) {
        this.showContent$.next(false)
        await this.appStateService.globalLoading$.publish(true)
      }

      await Promise.all([this.updateMfeInfo(r, joinedBaseUrl), this.updatePermissions(r)])

      if (!currentGlobalLoading) {
        await this.appStateService.globalLoading$.publish(false)
      }
    }
    return true
  }

  private async updateAppStyles(r: BffGeneratedRoute) {
    await updateStylesForMfeChange(r.productName, r.appId, this.httpClient, r.url)
  }

  private async updateMfeInfo(r: BffGeneratedRoute, joinedBaseUrl: string) {
    const mfeInfo = {
      baseHref: joinedBaseUrl,
      version: r.productVersion,
      mountPath: joinedBaseUrl,
      shellName: 'portal',
      remoteBaseUrl: r.url,
      displayName: r.displayName,
      appId: r.appId,
      productName: r.productName,
      remoteName: r.remoteName,
      elementName: r.elementName
    }
    return await this.appStateService.currentMfe$.publish(mfeInfo)
  }

  private async updatePermissions(r: BffGeneratedRoute) {
    const permissions = await firstValueFrom(
      this.permissionsCacheService.getPermissions(r.appId, r.productName, (appId, productName) =>
        this.permissionsService.getPermissions({ appId, productName }).pipe(map(({ permissions }) => permissions))
      )
    )
    await this.permissionsTopic$.publish(permissions)
  }

  private async onRemoteLoadError(err: unknown) {
    console.log(`Failed to load remote module: ${err}`)
    this.portalMessageService.error({
      summaryKey: 'ERROR_MESSAGES.ON_REMOTE_LOAD_ERROR'
    })

    const routerParams = {
      requestedApplicationPath: getLocation().applicationPath
    }

    this.router.navigate(['remote-loading-error-page', routerParams])
    throw err
  }

  private toLoadRemoteEntryOptions(r: BffGeneratedRoute): types.Remote {
    if (r.technology === Technologies.Angular || r.technology === Technologies.WebComponentModule) {
      return {
        type: 'module',
        entry: r.remoteEntryUrl,
        name: r.productName + '/' + r.appId
      }
    }
    return {
      type: 'script',
      alias: r.remoteName ?? '', // TODO: check
      entry: r.remoteEntryUrl,
      name: r.productName + '/' + r.appId
    }
  }

  private async toRouteUrl(url: string | undefined) {
    if (!url) {
      return url
    }
    const SHELL_BASE_HREF = await this.configurationService.getProperty(CONFIG_KEY.APP_BASE_HREF)
    if (SHELL_BASE_HREF && url.startsWith(SHELL_BASE_HREF)) {
      url = url.slice(SHELL_BASE_HREF.length)
    }

    if (url?.startsWith('/')) {
      url = url.substring(1)
    }
    if (url.endsWith('$')) {
      url = url.substring(0, url.length - 1)
    }
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1)
    }
    return url
  }

  private async containsRouteForWorkspace(routes: BffGeneratedRoute[]): Promise<boolean> {
    const baseUrl = (await firstValueFrom(this.appStateService.currentWorkspace$.asObservable())).baseUrl
    const routeUrl = await this.toRouteUrl(baseUrl)
    return routes.some((r) => r.baseUrl === routeUrl)
  }

  private async createFallbackRoute(): Promise<Route> {
    const currentWorkspace = await firstValueFrom(this.appStateService.currentWorkspace$.asObservable())
    const route = {
      path: await this.toRouteUrl(currentWorkspace.baseUrl),
      pathMatch: PathMatch.full
    }

    if (!currentWorkspace.homePage) {
      return {
        ...route,
        loadChildren: () => import('src/app/home/home.module').then((m) => m.HomeModule)
      }
    }
    return {
      ...route,
      redirectTo: await this.createHomePageUrl(currentWorkspace.baseUrl, currentWorkspace.homePage)
    }
  }

  private createHomePageUrl(baseUrl: string, homePage: string) {
    return this.toRouteUrl(Location.joinWithSlash(baseUrl, homePage))
  }
}
