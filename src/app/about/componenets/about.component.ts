import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { Federation } from '@module-federation/runtime-core'
import { TranslateModule } from '@ngx-translate/core'

interface AngularVersion {
  name: string
  version: string
  from: string
  eager: boolean
  loaded?: number
  shareScope?: string
}

const magicChar = String.fromCodePoint(0x10ffff) // Magic character for preloaders

@Component({
  standalone: true,
  imports: [CommonModule, TranslateModule],
  selector: 'ocx-shell-about',
  templateUrl: './about.component.html'
})
export class AboutComponent implements OnInit {
  supportedAngularVersions: AngularVersion[] = []

  ngOnInit() {
    this.loadSupportedVersions()
  }

  private loadSupportedVersions() {
    const federation = (globalThis as any).__FEDERATION__ as Federation
    const shellScopeMap = federation?.__INSTANCES__?.find((i: any) => i.name === 'onecx_shell_ui')?.shareScopeMap
    if (!shellScopeMap) {
      console.warn('onecx_shell_ui shareScopeMap not found. Supported Angular versions cannot be determined.')
      return
    }

    Object.entries(shellScopeMap).forEach(([scopeName, scopeData]: [string, any]) => {
      Object.entries(scopeData['@angular/core']).forEach(([version, data]: [string, any]) => {
        if (this.isAngularVersionBoundary(data)) {
          this.supportedAngularVersions.push({
            name: 'Angular ' + version.substring(0, version.indexOf('.')),
            version: version,
            from: data.from.replace(magicChar, ''),
            eager: data['eager'],
            loaded: data['loaded'] || 0,
            shareScope: scopeName
          })
        }
      })
    })
  }

  // We consider it a boundary if it's from one of our Angular builds or if it's from the shell UI and has at least one consumer
  // The latter is needed when preloader is used by the shell UI and package is registered as if it was loaded by the shell
  private isAngularVersionBoundary(data: any): boolean {
    // regex to match both 'onecx-angular-18-loader' and 'onecx_angular_19_loader'
    const angularLoaderRegex = /onecx[-_]angular[-_]\d+[-_]loader/i
    return angularLoaderRegex.test(data.from) || (data.from === 'onecx_shell_ui' && data.useIn && data.useIn.length > 0)
  }
}
