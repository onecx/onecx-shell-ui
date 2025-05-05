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
  loadPortalLayoutStylesStyles(css)
  loadDynamicPortalLayoutStylesStyles(css)
}

function loadPortalLayoutStylesStyles(css: string) {
  if (isCssScopeRuleSupported()) {
    addStyleToHead(
      `
      @scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
      ${extractRootRules(css)}
      ${extractNonRootRules(css)}
    }
    `,
      {
        [dataPortalLayoutStylesKey]: ''
      }
    )
  } else {
    addStyleToHead(
      `
      @supports(@scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
          ${extractRootRules(css)}
          ${extractNonRootRules(css)}
        }
        `,
      {
        [dataPortalLayoutStylesKey]: ''
      }
    )
  }
}

function loadDynamicPortalLayoutStylesStyles(css: string) {
  if (isCssScopeRuleSupported()) {
    addStyleToHead(
      `
      @scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
      ${extractRootRules(css)}
      ${extractNonRootRules(css)}
    }
      `,
      {
        [dataDynamicPortalLayoutStylesKey]: ''
      }
    )
  } else {
    addStyleToHead(
      `
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
}
