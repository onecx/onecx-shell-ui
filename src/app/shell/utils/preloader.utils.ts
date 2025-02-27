import { loadRemoteModule } from '@angular-architects/module-federation-runtime'
import { getLocation } from '@onecx/accelerator'

declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
    '@onecx/angular-webcomponents': any
  }
}

export interface Preloader {
  relativeRemoteEntryUrl: string
  windowKey: string
  exposedModule: string
}

export const angular18Preloader: Preloader = {
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-18-loader/remoteEntry.js',
  windowKey: 'angular-18',
  exposedModule: './Angular18Loader'
}

export function loadPreloaderModule(preloader: Preloader) {
  return loadRemoteModule({
    type: 'module',
    remoteEntry: `${getLocation().deploymentPath}${preloader.relativeRemoteEntryUrl}`,
    exposedModule: preloader.exposedModule
  })
}

export function ensurePreloaderModuleLoaded(preloader: Preloader) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (window['onecxPreloaders'][preloader.windowKey]) {
        resolve(true)
      }
    }, 50)
  })
}
