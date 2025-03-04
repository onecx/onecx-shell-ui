import { HttpClient } from '@angular/common/http'
import { getLocation } from '@onecx/accelerator'
import { firstValueFrom } from 'rxjs'

export async function fetchPortalLayoutStyles(http: HttpClient) {
  return await firstValueFrom(
    http.get(`${getLocation().deploymentPath}/assets/portal-layout-styles.css`, { responseType: 'text' })
  )
}

export function loadPortalLayoutStyles(css: string) {
  loadPortalLayoutStylesVariables(css)
  loadPortalLayoutStylesStyles(css)
}

function loadPortalLayoutStylesVariables(css: string) {
  createStyleElement(extractVariablesFromCss(css), 'portalLayoutStylesVariables')
}
function loadPortalLayoutStylesStyles(css: string) {
  createStyleElement(
    `
  @scope([data-style-id]:not([data-no-portal-layout-styles])) to ([data-style-isolation]) {
    ${extractStylesFromCss(css)}
  }
  `,
    'portalLayoutStylesStyles'
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
