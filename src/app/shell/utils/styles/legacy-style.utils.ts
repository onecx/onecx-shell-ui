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
  extractRootRules,
  extractNonRootRules
} from '@onecx/angular-utils'

export async function fetchPortalLayoutStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./portal-layout-styles.css`, { responseType: 'text' }))
}

export function loadPortalLayoutStyles(css: string) {
  const isScopeSupported = isCssScopeRuleSupported()
  addStyleToHead(
    isScopeSupported
      ? `
      @scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractRootRules(css)}
    ${extractNonRootRules(css)}
  }
  `
      : `
      @supports(@scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
        ${extractRootRules(css)}
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
      @scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractRootRules(css)}
    ${extractNonRootRules(css)}
  }
    `
      : `
      @supports(@scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
    ${extractRootRules(css)}
    ${extractNonRootRules(css)}
  }
  `,
    {
      [dataDynamicPortalLayoutStylesKey]: ''
    }
  )
}
