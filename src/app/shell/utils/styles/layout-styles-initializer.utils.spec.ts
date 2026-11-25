import { HttpClient } from '@angular/common/http'
import { AppStateService } from '@onecx/angular-integration-interface'

import { fetchPortalLayoutStyles, loadPortalLayoutStyles } from './legacy-style.utils'
import { portalLayoutStylesInitializer, shellStylesInitializer } from './layout-styles-initializer.utils'
import { fetchShellStyles, loadShellStyles } from './shell-styles.utils'

jest.mock('./legacy-style.utils')
jest.mock('./shell-styles.utils')

describe('layout styles initializers', () => {
  const http = {} as HttpClient
  const appStateService = { isAuthenticated$: { isInitialized: Promise.resolve() } } as unknown as AppStateService

  beforeEach(() => {
    jest.mocked(fetchShellStyles).mockResolvedValue('shell-css')
    jest.mocked(fetchPortalLayoutStyles).mockResolvedValue('portal-css')
  })

  it('given an authenticated user, when the shell styles initializer runs, then the fetched shell styles are loaded', async () => {
    await shellStylesInitializer(appStateService, http)

    expect(fetchShellStyles).toHaveBeenCalledWith(http)
    expect(loadShellStyles).toHaveBeenCalledWith('shell-css')
  })

  it('given an authenticated user, when the portal layout styles initializer runs, then the fetched layout styles are loaded', async () => {
    await portalLayoutStylesInitializer(appStateService, http)

    expect(fetchPortalLayoutStyles).toHaveBeenCalledWith(http)
    expect(loadPortalLayoutStyles).toHaveBeenCalledWith('portal-css')
  })
})
