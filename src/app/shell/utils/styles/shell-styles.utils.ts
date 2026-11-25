import { HttpClient } from '@angular/common/http'
import {
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported,
  shellScopeId
} from '@onecx/angular-utils'
import { addStyleToHead, replaceRootWithScope } from '@onecx/angular-utils/style'
import { markElement } from './style-data.utils'
import { fetchRuntimeStyle } from './runtime-style.utils'

export async function fetchShellStyles(http: HttpClient) {
  return await fetchRuntimeStyle(http, 'shell-styles')
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
