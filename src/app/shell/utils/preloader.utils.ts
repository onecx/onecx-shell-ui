import { RemoteComponent, Route } from 'src/app/shared/generated'

declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
  }
}

export interface Preloader {
  name: string
  relativeRemoteEntryUrl: string
  windowKey: string
  exposedModule: string
  shareScope: string
}

export const angular18Preloader: Preloader = {
  name: 'angular-18-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-18-loader/mf-manifest.json',
  windowKey: 'angular-18',
  exposedModule: 'Angular18Loader',
  shareScope: 'default'
}

export const angular19Preloader: Preloader = {
  name: 'angular-19-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-19-loader/mf-manifest.json',
  windowKey: 'angular-19',
  exposedModule: 'Angular19Loader',
  shareScope: 'default'
}

export const angular20Preloader: Preloader = {
  name: 'angular-20-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-20-loader/mf-manifest.json',
  windowKey: 'angular-20',
  exposedModule: 'Angular20Loader',
  shareScope: 'default'
}

export const angular21Preloader: Preloader = {
  name: 'angular-21-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-21-loader/mf-manifest.json',
  windowKey: 'angular-21',
  exposedModule: 'Angular21Loader',
  shareScope: 'angular_21'
}

export const angular22Preloader: Preloader = {
  name: 'angular-22-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-22-loader/mf-manifest.json',
  windowKey: 'angular-22',
  exposedModule: 'Angular22Loader',
  shareScope: 'angular_22'
}

export const react19Preloader: Preloader = {
  name: 'react-19-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-react-19-loader/mf-manifest.json',
  windowKey: 'react-19',
  exposedModule: 'React19Loader',
  shareScope: 'react_19'
}

export const allPreloaders = [
  angular18Preloader,
  angular19Preloader,
  angular20Preloader,
  angular21Preloader,
  angular22Preloader,
  react19Preloader
]

type PreloaderMetadata = Pick<Route, 'shareScope'> | Pick<RemoteComponent, 'shareScope'>

export function selectRequiredPreloaders(
  routes: readonly PreloaderMetadata[],
  components: readonly PreloaderMetadata[]
): Preloader[] {
  const records = [...routes, ...components]
  if (records.some(({ shareScope }) => !shareScope)) {
    return allPreloaders
  }

  const required = new Set<Preloader>()
  for (const { shareScope } of records) {
    switch (shareScope) {
      case 'default':
        required.add(angular18Preloader)
        required.add(angular19Preloader)
        required.add(angular20Preloader)
        break
      case 'angular_21':
        required.add(angular21Preloader)
        break
      case 'angular_22':
        required.add(angular22Preloader)
        break
      case 'react_19':
        required.add(react19Preloader)
        break
      default:
        return allPreloaders
    }
  }

  return allPreloaders.filter((preloader) => required.has(preloader))
}

export async function loadPreloadersForWorkspace(
  routes: readonly PreloaderMetadata[],
  components: readonly PreloaderMetadata[]
) {
  await Promise.all(selectRequiredPreloaders(routes, components).map(loadPreloaderModule))
}

export async function initializeWorkspaceAfterPreloaders(
  routes: readonly PreloaderMetadata[],
  components: readonly PreloaderMetadata[],
  initializeWorkspace: () => Promise<void>
): Promise<void> {
  await loadPreloadersForWorkspace(routes, components)
  await initializeWorkspace()
}

const inFlightPreloaderLoads = new Map<string, Promise<void>>()

export function loadPreloaderModule(preloader: Preloader): Promise<void> {
  window['onecxPreloaders'] ??= {}
  if (window['onecxPreloaders'][preloader.windowKey]) {
    return Promise.resolve()
  }

  const inFlightLoad = inFlightPreloaderLoads.get(preloader.windowKey)
  if (inFlightLoad) {
    return inFlightLoad
  }

  const load = loadAndWaitForPreloader(preloader)
  inFlightPreloaderLoads.set(preloader.windowKey, load)
  load.then(
    () => inFlightPreloaderLoads.delete(preloader.windowKey),
    () => inFlightPreloaderLoads.delete(preloader.windowKey)
  )
  return load
}

async function loadAndWaitForPreloader(preloader: Preloader): Promise<void> {
  try {
    const moduleFederation = await import('@module-federation/enhanced/runtime')
    moduleFederation.registerRemotes([
      {
        type: 'module',
        entry: `${getLocation().deploymentPath}${preloader.relativeRemoteEntryUrl}`,
        name: preloader.name,
        shareScope: preloader.shareScope
      }
    ])
    const loadPromise = moduleFederation.loadRemote(preloader.name + '/' + preloader.exposedModule)
    await loadPromise
    if (!window['onecxPreloaders'][preloader.windowKey]) {
      throw new Error(`Preloader did not report readiness: ${preloader.windowKey}`)
    }
  } catch (error) {
    console.warn(`Could not load preloader: ${preloader.windowKey}. Application might not work as expected.`)
    console.error(error)
    throw error
  }
}

export function getLocation() {
  const baseHref = document.getElementsByTagName('base')[0]?.href ?? window.location.origin + '/'
  const location = window.location as any
  location.deploymentPath = baseHref.substring(window.location.origin.length)
  location.applicationPath = window.location.href.substring(baseHref.length - 1)

  return location
}
