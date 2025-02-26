import { loadRemoteModule } from '@angular-architects/module-federation-runtime'
import { getLocation } from '@onecx/accelerator'

declare global {
  interface Window {
    onecxDummy: Record<string, any>
    '@onecx/angular-webcomponents': any
  }
}

export interface DummyLoader {
  relativeRemoteEntryUrl: string
  windowKey: string
  exposedModule: string
}

export const angular18DummyLoader: DummyLoader = {
  relativeRemoteEntryUrl: 'dummy_loaders/onecx-angular-18-dummy/remoteEntry.js',
  windowKey: 'angular18',
  exposedModule: './Angular18Loader'
}

export function loadDummyModule(dummy: DummyLoader) {
  return loadRemoteModule({
    type: 'module',
    remoteEntry: `${getLocation().deploymentPath}${dummy.relativeRemoteEntryUrl}`,
    exposedModule: dummy.exposedModule
  })
}

export function ensureDummyModuleLoaded(dummy: DummyLoader) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (window['onecxDummy'][dummy.windowKey]) {
        resolve(true)
      }
    }, 100)
  })
}

export function ensureShellLoaded() {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (window['@onecx/angular-webcomponents'].ngZone) {
        resolve(true)
      }
    }, 100)
  })
}
