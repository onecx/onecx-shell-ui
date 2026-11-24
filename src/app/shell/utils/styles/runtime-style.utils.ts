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
  const documentBase = document.querySelector('base')?.href ?? document.baseURI
  const resolvedStylesheetUrl = new URL(stylesheetUrl, documentBase)

  return replaceCssUrls(css, resolvedStylesheetUrl)
}

function replaceCssUrls(css: string, stylesheetUrl: URL): string {
  let result = ''
  let cursor = 0

  while (cursor < css.length) {
    const openingIndex = css.indexOf('url(', cursor)
    if (openingIndex < 0) {
      return result + css.slice(cursor)
    }

    const closingIndex = css.indexOf(')', openingIndex + 4)
    if (closingIndex < 0) {
      return result + css.slice(cursor)
    }

    result += css.slice(cursor, openingIndex)
    const match = css.slice(openingIndex, closingIndex + 1)
    const rawValue = css.slice(openingIndex + 4, closingIndex)
    result += rewriteCssUrl(match, rawValue, stylesheetUrl)
    cursor = closingIndex + 1
  }

  return result
}

function rewriteCssUrl(match: string, rawValue: string, stylesheetUrl: URL): string {
  const parsedUrl = parseCssUrl(rawValue)
  if (!parsedUrl || !parsedUrl.assetUrl || isAbsoluteCssUrl(parsedUrl.assetUrl)) {
    return match
  }

  return `url(${parsedUrl.quote}${new URL(parsedUrl.assetUrl, stylesheetUrl).href}${parsedUrl.quote})`
}

function parseCssUrl(rawValue: string): { assetUrl: string; quote: string } | undefined {
  const value = rawValue.trim()
  if (!value) {
    return undefined
  }

  const quote = value[0]
  if (quote !== '"' && quote !== "'") {
    return value.includes('"') || value.includes("'") ? undefined : { assetUrl: value, quote: '' }
  }

  if (!value.endsWith(quote)) {
    return undefined
  }

  const assetUrl = value.slice(1, -1)
  if (assetUrl.includes('"') || assetUrl.includes("'")) {
    return undefined
  }

  return { assetUrl, quote }
}

function isAbsoluteCssUrl(assetUrl: string): boolean {
  return (
    assetUrl.startsWith('/') ||
    assetUrl.startsWith('#') ||
    assetUrl.startsWith('data:') ||
    /^[a-z][a-z\d+.-]*:/i.test(assetUrl)
  )
}
