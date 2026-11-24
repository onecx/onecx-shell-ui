import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'

export async function resolveRuntimeStyleUrl(http: HttpClient, bundleName: string): Promise<string> {
  try {
    const manifest = await firstValueFrom(
      http.request<Record<string, string>>('get', './style-manifest.json', { responseType: 'json' })
    )
    const emittedName = manifest[bundleName]
    if (emittedName) {
      return `./${emittedName}`
    }
  } catch {
    // Development/no-hash builds and older deployments do not provide the manifest.
  }

  return `./${bundleName}.css`
}

export async function fetchRuntimeStyle(http: HttpClient, bundleName: string): Promise<string> {
  const url = await resolveRuntimeStyleUrl(http, bundleName)
  const css = await firstValueFrom(http.request('get', url, { responseType: 'text' }))
  return resolveRelativeCssUrls(css, url)
}

export function resolveRelativeCssUrls(css: string, stylesheetUrl: string): string {
  const baseElement = document.querySelector('base')
  const documentBase = baseElement?.href ?? globalThis.location?.href ?? '/'
  const resolvedStylesheetUrl = new URL(stylesheetUrl, documentBase)

  return css.replace(/url\(\s*(['"]?)([^)'"]*?)\1\s*\)/g, (match, quote: string, rawAssetUrl: string) => {
    const assetUrl = rawAssetUrl.trim()
    if (!assetUrl) {
      return match
    }

    if (
      assetUrl.startsWith('/') ||
      assetUrl.startsWith('#') ||
      assetUrl.startsWith('data:') ||
      /^[a-z][a-z\d+.-]*:/i.test(assetUrl)
    ) {
      return match
    }

    return `url(${quote}${new URL(assetUrl, resolvedStylesheetUrl).href}${quote})`
  })
}
