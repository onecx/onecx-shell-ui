declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
  }
}

export interface Preloader {
  relativeRemoteEntryUrl: string
  remoteName: string
  exposedModule: string
}

export const angular18Preloader: Preloader = {
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-18-loader/remoteEntry.js',
  remoteName: 'angular-18',
  exposedModule: './Angular18Loader'
}

export const angular19Preloader: Preloader = {
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-19-loader/remoteEntry.js',
  remoteName: 'angular-19',
  exposedModule: './Angular19Loader'
}

export const angular20Preloader: Preloader = {
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-20-loader/remoteEntry.js',
  remoteName: 'angular-20',
  exposedModule: './Angular20Loader'
}

export async function loadPreloaderModule(preloader: Preloader) {
  const moduleFederation = await import('@module-federation/enhanced/runtime')
  moduleFederation.registerRemotes([
    {
      type: 'module',
      entry: `${getLocation().deploymentPath}${preloader.relativeRemoteEntryUrl}`,
      name: preloader.remoteName
    }
  ])
  moduleFederation.loadRemote(preloader.remoteName + '/' + preloader.exposedModule)
}

export function ensurePreloaderModuleLoaded(preloader: Preloader) {
  return new Promise((resolve) => {
    if (window['onecxPreloaders'][preloader.remoteName]) {
      resolve(true)
      return
    }
    const ensureIntevalId = setInterval(() => {
      if (window['onecxPreloaders'][preloader.remoteName]) {
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
