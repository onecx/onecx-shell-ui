import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { createStyleElement, extractStylesFromCss, extractVariablesFromCss } from './styles.utils'
import {
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported,
  shellScopeId
} from '@onecx/angular-utils'

export async function fetchShellStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./shell-styles.css`, { responseType: 'text' }))
}

export function loadShellStyles(css: string) {
  const isScopeSupported = isCssScopeRuleSupported()
  createStyleElement(
    isScopeSupported
      ? `
      ${extractVariablesFromCss(css)}
      @scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}]) {
        ${extractStylesFromCss(css)}
      }
    `
      : `
      ${extractVariablesFromCss(css)}
      @supports (@scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}])) {
            ${extractStylesFromCss(css)}
        }
    `,
    {
      shellStylesStyles: ''
    }
  )
}
