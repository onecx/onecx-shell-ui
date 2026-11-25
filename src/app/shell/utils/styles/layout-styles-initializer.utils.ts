import { HttpClient } from '@angular/common/http'
import { AppStateService } from '@onecx/angular-integration-interface'

import { fetchPortalLayoutStyles, loadPortalLayoutStyles } from './legacy-style.utils'
import { fetchShellStyles, loadShellStyles } from './shell-styles.utils'

/**
 * Loads the shell styles once the user is authenticated.
 */
export async function shellStylesInitializer(appStateService: AppStateService, http: HttpClient) {
  await appStateService.isAuthenticated$.isInitialized
  const css = await fetchShellStyles(http)
  loadShellStyles(css)
}

/**
 * Loads the legacy portal layout styles once the user is authenticated.
 */
export async function portalLayoutStylesInitializer(appStateService: AppStateService, http: HttpClient) {
  await appStateService.isAuthenticated$.isInitialized
  const css = await fetchPortalLayoutStyles(http)
  loadPortalLayoutStyles(css)
}
