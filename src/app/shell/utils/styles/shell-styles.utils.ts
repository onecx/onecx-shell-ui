import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import {
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported,
  shellScopeId,
  addStyleToHead,
  extractRootRules,
  extractNonRootRules
} from '@onecx/angular-utils'

export async function fetchShellStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./shell-styles.css`, { responseType: 'text' }))
}

export function loadShellStyles(css: string) {
  if (isCssScopeRuleSupported()) {
    addStyleToHead(
      `
      @scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}]) {
          ${extractRootRules(css)}
          ${extractNonRootRules(css)}
        }
      `,
      {
        shellStylesStyles: ''
      }
    )
  } else {
    addStyleToHead(
      `
      @supports (@scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}])) {
          ${extractRootRules(css)}
              ${extractNonRootRules(css)}
          }
      `,
      {
        shellStylesStyles: ''
      }
    )
  }
}
