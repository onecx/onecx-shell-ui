import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import {
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported,
  shellScopeId
} from '@onecx/angular-utils'
import { addStyleToHead, replaceRootWithScope } from '@onecx/angular-utils/style'
import { markElement } from './style-data.utils'

export async function fetchShellStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./shell-styles.css`, { responseType: 'text' }))
}

export function loadShellStyles(css: string) {
  if (isCssScopeRuleSupported()) {
    const styleElement = addStyleToHead(
      `
      @scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}]) {
          ${replaceRootWithScope(css)}
        }
      `,
      {
        shellStylesStyles: ''
      }
    )
    markElement(styleElement, 'shellStylesStyles')
  } else {
    const styleElement = addStyleToHead(
      `
      @supports (@scope([${dataStyleIdAttribute}="${shellScopeId}"]) to ([${dataStyleIsolationAttribute}])) {
          ${replaceRootWithScope(css)}
          }
      `,
      {
        shellStylesStyles: ''
      }
    )
    ;(styleElement as any).onecxOriginalCss = css
    markElement(styleElement, 'shellStylesStyles')
  }
}
