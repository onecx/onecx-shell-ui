import { DoBootstrap, NgModule } from '@angular/core'

declare global {
  interface Window {
    onecxPreloaders: Record<string, any>
  }
}

@NgModule({
  imports: [],
  providers: []
})
export class PreloaderModule implements DoBootstrap {
  ngDoBootstrap(): void {
    window['onecxPreloaders'] ??= {}
    window['onecxPreloaders']['angular-20'] = true
  }
}
