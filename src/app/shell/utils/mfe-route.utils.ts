import { ActivatedRouteSnapshot, PRIMARY_OUTLET, RouterStateSnapshot } from '@angular/router'
import { MFE_ROUTE_DATA_KEY } from 'src/app/app.routes'

/**
 * Checks whether the activated primary-outlet chain contains a workspace microfrontend route.
 * Only the route configurations are checked, so the result does not depend on route data inheritance.
 * @param snapshot the router state to check
 * @returns true if a route of the primary-outlet chain is marked with {@link MFE_ROUTE_DATA_KEY}
 */
export function isMfeRoute(snapshot: RouterStateSnapshot): boolean {
  let route: ActivatedRouteSnapshot | undefined = snapshot.root
  while (route) {
    if (route.routeConfig?.data?.[MFE_ROUTE_DATA_KEY] === true) return true
    route = route.children.find((child) => child.outlet === PRIMARY_OUTLET)
  }
  return false
}
