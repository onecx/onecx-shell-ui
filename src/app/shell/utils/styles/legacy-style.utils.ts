import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { createStyleElement, extractStylesFromCss, extractVariablesFromCss } from './styles.utils'
import {
  dataNoPortalLayoutStylesAttribute,
  dataStyleIdAttribute,
  dataStyleIsolationAttribute,
  dataPortalLayoutStylesKey,
  dataDynamicPortalLayoutStylesKey
} from '@onecx/angular-utils'

export async function fetchPortalLayoutStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./portal-layout-styles.css`, { responseType: 'text' }))
}

export function loadPortalLayoutStyles(css: string) {
  createStyleElement(
    `
    ${extractVariablesFromCss(css)}
  @scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractStylesFromCss(css)}
  }
  `,
    {
      [dataPortalLayoutStylesKey]: ''
    }
  )
  createStyleElement(
    `
    ${extractVariablesFromCss(css)}
  @scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractStylesFromCss(css)}
  }
  `,
    {
      [dataDynamicPortalLayoutStylesKey]: ''
    }
  )
}
