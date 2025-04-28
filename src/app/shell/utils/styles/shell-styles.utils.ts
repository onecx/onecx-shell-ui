import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import {
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported,
  shellScopeId,
  addStyleToHead,
  extractRootCssVariables,
  extractCssStyles
} from '@onecx/angular-utils'

export async function fetchShellStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./shell-styles.css`, { responseType: 'text' }))
}

export function loadShellStyles(css: string) {
  const isScopeSupported = isCssScopeRuleSupported()
  addStyleToHead(
    isScopeSupported
      ? `
      ${extractRootCssVariables(css)}
      @scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}]) {
        ${extractCssStyles(css)}
      }
    `
      : `
      ${extractRootCssVariables(css)}
      @supports (@scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}])) {
            ${extractCssStyles(css)}
        }
    `,
    {
      shellStylesStyles: ''
    }
  )
}
