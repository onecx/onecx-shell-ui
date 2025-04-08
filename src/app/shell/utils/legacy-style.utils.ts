import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { dataNoPortalLayoutStylesAttribute, dataStyleIdAttribute, dataStyleIsolationAttribute } from 'src/scope-utils'

export async function fetchPortalLayoutStyles(http: HttpClient) {
  return await firstValueFrom(http.request('get', `./portal-layout-styles.css`, { responseType: 'text' }))
}

export function loadPortalLayoutStyles(css: string) {
  loadPortalLayoutStylesVariables(css)
  loadPortalLayoutStylesStyles(css)
}

function loadPortalLayoutStylesVariables(css: string) {
  createStyleElement(extractVariablesFromCss(css), 'portalLayoutStylesVariables')
}
function loadPortalLayoutStylesStyles(css: string) {
  const isScopeSupported = typeof CSSScopeRule !== 'undefined'
  createStyleElement(
    isScopeSupported
      ? `
  @scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractStylesFromCss(css)}
  }
  `
      : `
  @supports(@scope([${dataStyleIdAttribute}]:not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
    ${extractStylesFromCss(css)}
  }
  `,
    'portalLayoutStylesStyles'
  )
  createStyleElement(
    isScopeSupported
      ? `
  @scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}]) {
    ${extractStylesFromCss(css)}
  }
  `
      : `
  @supports(@scope(body > :not([${dataNoPortalLayoutStylesAttribute}])) to ([${dataStyleIsolationAttribute}])) {
    ${extractStylesFromCss(css)}
  }
  `,
    'dynamicContentPortalLayoutStyles'
  )
}

function createStyleElement(content: string, dataAttribute?: string) {
  const style = document.createElement('style')

  style.appendChild(document.createTextNode(content))
  if (dataAttribute) style.dataset[dataAttribute] = ''
  document.head.appendChild(style)
}

function extractVariablesFromCss(css: string): string {
  const matches = css.match(/:root\s*\{[^}]*\}/g)
  if (!matches) return ''

  return matches.join(' ')
}

function extractStylesFromCss(css: string): string {
  return css.replace(/:root\s*\{[^}]*\}/g, '')
}
