import { inject, Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, DefaultTitleStrategy, PRIMARY_OUTLET, RouterStateSnapshot } from '@angular/router'
import { from, Subscription } from 'rxjs'

import { ConfigurationService } from '@onecx/angular-integration-interface'

import { MFE_ROUTE_DATA_KEY } from './routes.service'

/**
 * Configuration key that disables document titles written by the shell for microfrontend routes.
 */
export const MFE_TITLES_DISABLED_CONFIG_KEY = 'ONECX_PORTAL_MFE_TITLES_DISABLED'

/**
 * Title strategy of the shell.
 *
 * Behaves like Angular's {@link DefaultTitleStrategy}. If the configuration value
 * `ONECX_PORTAL_MFE_TITLES_DISABLED` is `'true'`, the shell does not write `document.title`
 * while a workspace microfrontend route is active, so that the microfrontend can own the title.
 *
 * @example
 * providers: [{ provide: TitleStrategy, useExisting: ShellTitleStrategy }]
 */
@Injectable({ providedIn: 'root' })
export class ShellTitleStrategy extends DefaultTitleStrategy {
  private readonly configurationService = inject(ConfigurationService)
  private pendingTitleUpdate?: Subscription

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pendingTitleUpdate?.unsubscribe()
    if (!isMfeRoute(snapshot)) {
      super.updateTitle(snapshot)
      return
    }
    this.pendingTitleUpdate = from(this.configurationService.getConfig()).subscribe((config) => {
      if (!isMfeTitlesDisabled(config?.[MFE_TITLES_DISABLED_CONFIG_KEY])) {
        super.updateTitle(snapshot)
      }
    })
  }
}

function isMfeRoute(snapshot: RouterStateSnapshot): boolean {
  let route: ActivatedRouteSnapshot | undefined = snapshot.root
  while (route) {
    if (route.routeConfig?.data?.[MFE_ROUTE_DATA_KEY]) {
      return true
    }
    route = route.children.find((child) => child.outlet === PRIMARY_OUTLET)
  }
  return false
}

function isMfeTitlesDisabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}
