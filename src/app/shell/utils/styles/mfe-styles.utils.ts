import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
  dataAppStylesKey,
  dataMfeStylesAttribute,
  dataMfeStylesKey,
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  isCssScopeRuleSupported
} from '@onecx/angular-utils'
import { firstValueFrom } from 'rxjs'
import { createStyleElement, extractStylesFromCss, extractVariablesFromCss, updateStyleElement } from './styles.utils'

export async function fetchMfeStyles(http: HttpClient, appUrl: string) {
  return await firstValueFrom(
    http.request('get', Location.joinWithSlash(appUrl, 'styles.css'), { responseType: 'text' })
  )
}

export function updateMfeStyles(css: string, scopeId: string) {
  const isScopeSupported = isCssScopeRuleSupported()
  updateStyleElement(
    `style[${dataMfeStylesAttribute}="${scopeId}"]`,
    isScopeSupported
      ? `
  ${extractVariablesFromCss(css)}
@scope([${dataStyleIdAttribute}="${scopeId}"]) to ([${dataStyleIsolationAttribute}]) {
        ${extractStylesFromCss(css)}
    }
`
      : `
  ${extractVariablesFromCss(css)}
@supports (@scope([${dataStyleIdAttribute}="${scopeId}"]) to ([${dataStyleIsolationAttribute}])) {
        ${extractStylesFromCss(css)}
    }
`
  )
}

export function createMfeStyles(scopeId: string) {
  createStyleElement('', {
    [dataAppStylesKey]: scopeId,
    [dataMfeStylesKey]: scopeId
  })
}
