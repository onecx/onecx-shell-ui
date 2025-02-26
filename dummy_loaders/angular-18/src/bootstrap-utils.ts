import { BrowserModule, platformBrowser } from '@angular/platform-browser'
import {
  ApplicationRef,
  DoBootstrap,
  NgModule,
  NgZone,
  PlatformRef,
  VERSION,
  Version,
  enableProdMode,
  getPlatform
} from '@angular/core'
import { RouterModule } from '@angular/router'

declare global {
  interface Window {
    onecxDummy: Record<string, any>
  }
}

@NgModule({
  imports: [BrowserModule, RouterModule.forRoot([])]
})
export class DummyModule implements DoBootstrap {
  ngDoBootstrap(): void {
    window['onecxDummy'] ??= {}
    window['onecxDummy']['angular18'] = true
  }
}

export function getWindowState(): any {
  const state = window as any
  state['@onecx/angular-webcomponents'] ??= {} as unknown
  return state['@onecx/angular-webcomponents']
}

export function getNgZone(): NgZone {
  return getWindowState().ngZone
}

export function cachePlatform(production: boolean): PlatformRef {
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
