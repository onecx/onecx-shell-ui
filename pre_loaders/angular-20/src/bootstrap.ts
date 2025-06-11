import { NgZone, PlatformRef, VERSION, Version, enableProdMode, getPlatform } from '@angular/core'
import { PreloaderModule } from './bootstrap-utils'
import { platformBrowser } from '@angular/platform-browser'

function cachePlatform(production: boolean): PlatformRef {
  let platformCache: Map<Version, PlatformRef> = getWindowState().platformCache
  if (!platformCache) {
    platformCache = new Map<Version, PlatformRef>()
    getWindowState().platformCache = platformCache
  }
  const version = VERSION
  let platform: any = platformCache.get(version)
  if (!platform) {
    platform = getPlatform() ?? platformBrowser()
    platform && platformCache.set(version, platform)
    production ?? enableProdMode()
  }
  return platform
}

function getWindowState(): any {
  const state = window as any
  state['@onecx/angular-webcomponents'] ??= {} as unknown
  return state['@onecx/angular-webcomponents']
}

function getNgZone(): NgZone {
  return getWindowState().ngZone
}

cachePlatform(true)
  .bootstrapModule(PreloaderModule, {
    ngZone: getNgZone()
  })
  .then((ref) => {
    const features = (ref as any)._moduleDef?.features
    console.log('FEATURES:', features)
    return ref
  })
