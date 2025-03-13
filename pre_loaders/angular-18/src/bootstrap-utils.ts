import { BrowserModule } from '@angular/platform-browser'
import { DoBootstrap, NgModule } from '@angular/core'
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
