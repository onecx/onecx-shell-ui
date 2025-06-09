import { loadRemoteModule } from '@angular-architects/module-federation-runtime'
import { getLocation } from '@onecx/accelerator'

declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
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

export const angular20Preloader: Preloader = {
  relativeRemoteEntryUrl: 'pre_loaders/onecx-angular-20-loader/remoteEntry.js',
  windowKey: 'angular-20',
  exposedModule: './Angular20Loader'
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
    const ensureIntevalId = setInterval(() => {
      if (window['onecxPreloaders'][preloader.windowKey]) {
        clearInterval(ensureIntevalId)
        resolve(true)
      }
    }, 50)
  })
}
