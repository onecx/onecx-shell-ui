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
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-18-loader/remoteEntry.js',
  windowKey: 'angular-18',
  exposedModule: 'Angular18Loader',
  shareScope: 'default'
}

export const angular19Preloader: Preloader = {
  name: 'angular-19-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-19-loader/remoteEntry.js',
  windowKey: 'angular-19',
  exposedModule: 'Angular19Loader',
  shareScope: 'default'
}

export const angular20Preloader: Preloader = {
  name: 'angular-20-preloader',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-20-loader/remoteEntry.mjs',
  windowKey: 'angular-20',
  exposedModule: 'Angular20Loader',
  shareScope: 'angular_20'
}

export async function loadPreloaderModule(preloader: Preloader) {
  const moduleFederation = await import('@module-federation/enhanced/runtime')
  moduleFederation.registerRemotes([
    {
      type: 'module',
      entry: `${getLocation().deploymentPath}${preloader.relativeRemoteEntryUrl}`,
      name: preloader.name,
      shareScope: preloader.shareScope
    }
  ])
  await moduleFederation.loadRemote(preloader.name + '/' + preloader.exposedModule).catch((e) => {
    console.warn(`Could not load preloader: ${preloader.windowKey}. Application might not work as expected.`)
    console.error(e)
    window['onecxPreloaders'][preloader.windowKey] = true
  })
}

export function ensurePreloaderModuleLoaded(preloader: Preloader) {
  return new Promise((resolve) => {
    if (window['onecxPreloaders'][preloader.windowKey]) {
      resolve(true)
      return
    }
    const ensureIntevalId = setInterval(() => {
      if (window['onecxPreloaders'][preloader.windowKey]) {
        clearInterval(ensureIntevalId)
        resolve(true)
      }
    }, 50)
  })
}

export function getLocation() {
  const baseHref = document.getElementsByTagName('base')[0]?.href ?? window.location.origin + '/'
  const location = window.location as any
  location.deploymentPath = baseHref.substring(window.location.origin.length)
  location.applicationPath = window.location.href.substring(baseHref.length - 1)

  return location
}
