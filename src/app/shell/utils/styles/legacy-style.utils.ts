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
  extractNonRootRules,
  extractRootRules
} from '@onecx/angular-utils'

export async function fetchPortalLayoutStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./portal-layout-styles.css`, { responseType: 'text' }))
}

export function loadPortalLayoutStyles(css: string) {
  const isScopeSupported = isCssScopeRuleSupported()
  addStyleToHead(
    isScopeSupported
      ? `
    ${extractRootRules(css)}
  @scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractNonRootRules(css)}
  }
  `
      : `
      ${extractRootRules(css)}
      @supports(@scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
        ${extractNonRootRules(css)}
      }
      `,
    {
      [dataPortalLayoutStylesKey]: ''
    }
  )

  addStyleToHead(
    isScopeSupported
      ? `
    ${extractRootRules(css)}
  @scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractNonRootRules(css)}
  }
    `
      : `
    ${extractRootRules(css)}
  @supports(@scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
    ${extractNonRootRules(css)}
  }
  `,
    {
      [dataDynamicPortalLayoutStylesKey]: ''
    }
  )
}
