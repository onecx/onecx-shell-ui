import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import {
  dataNoPortalLayoutStylesAttribute,
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  dataPortalLayoutStylesKey,
  dataDynamicPortalLayoutStylesKey,
  isCssScopeRuleSupported,
  addStyleToHead,
  extractCssStyles,
  extractRootCssVariables
} from '@onecx/angular-utils'

export async function fetchPortalLayoutStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./portal-layout-styles.css`, { responseType: 'text' }))
}

export function loadPortalLayoutStyles(css: string) {
  const isScopeSupported = isCssScopeRuleSupported()
  addStyleToHead(
    isScopeSupported
      ? `
    ${extractRootCssVariables(css)}
  @scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractCssStyles(css)}
  }
  `
      : `
      ${extractRootCssVariables(css)}
      @supports(@scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
        ${extractCssStyles(css)}
      }
      `,
    {
      [dataPortalLayoutStylesKey]: ''
    }
  )

  addStyleToHead(
    isScopeSupported
      ? `
    ${extractRootCssVariables(css)}
  @scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractCssStyles(css)}
  }
    `
      : `
    ${extractRootCssVariables(css)}
  @supports(@scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
    ${extractCssStyles(css)}
  }
  `,
    {
      [dataDynamicPortalLayoutStylesKey]: ''
    }
  )
}
