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
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-20-loader/remoteEntry.js',
  windowKey: 'angular-20',
  exposedModule: 'Angular20Loader',
  shareScope: 'default'
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

// TODO: Clarify where this should be used --> move to angular-remote-components and utilize in routes.service, slots
// export function getShareScope(manifest: any): string {
//   const angularCore = manifest.shared.find((s: any) => s.name === '@angular/core')
//   if (!angularCore) {
//     console.warn('Could not determine Angular version from manifest. Using default share scope.')
//     return 'default'
//   }

//   const version = angularCore.version.split('.')[0]
//   if (!version || version === '18' || version === '19') {
//     console.warn('Using default share scope for Angular version:', version)
//     return 'default'
//   }

//   return `angular_${version}`
// }

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
