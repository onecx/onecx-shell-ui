declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
  }
}

const magicChar = String.fromCodePoint(0x10ffff) // Magic character for preloaders

export interface Preloader {
  name: string
  relativeRemoteEntryUrl: string
  remoteName: string
  moduleId: string
}

export const angular18Preloader: Preloader = {
  name: 'angular-18',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-18-loader/remoteEntry.js',
  remoteName: magicChar + 'onecx-angular-18-loader',
  moduleId: magicChar + 'onecx-angular-18-loader/Angular18Loader'
}

export const angular19Preloader: Preloader = {
  name: 'angular-19',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-19-loader/remoteEntry.js',
  remoteName: magicChar + 'onecx-angular-19-loader',
  moduleId: magicChar + 'onecx-angular-19-loader/Angular19Loader'
}

export const angular20Preloader: Preloader = {
  name: 'angular-20',
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-20-loader/remoteEntry.js',
  remoteName: magicChar + 'onecx-angular-20-loader',
  moduleId: magicChar + 'onecx-angular-20-loader/Angular20Loader'
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
  await moduleFederation.loadRemote(preloader.moduleId)
}

export function ensurePreloaderModuleLoaded(preloader: Preloader) {
  return new Promise((resolve) => {
    if (window['onecxPreloaders'][preloader.name]) {
      resolve(true)
      return
    }
    const ensureIntevalId = setInterval(() => {
      if (window['onecxPreloaders'][preloader.name]) {
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
