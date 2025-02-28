import { BrowserModule, platformBrowser } from '@angular/platform-browser'
import {
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
import { AngularRemoteComponentsModule } from '@onecx/angular-remote-components'
import { createTranslateLoader } from '@onecx/angular-utils'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { HttpClient } from '@angular/common/http'

declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
  }
}

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot([]),
    AngularRemoteComponentsModule,
    TranslateModule.forRoot({
      extend: true,
      isolate: false,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    })
  ]
})
export class PreloaderModule implements DoBootstrap {
  ngDoBootstrap(): void {
    window['onecxPreloaders'] ??= {}
    window['onecxPreloaders']['angular-18'] = true
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
