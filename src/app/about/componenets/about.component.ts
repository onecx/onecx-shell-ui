import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
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
    const shellScopeMap = __FEDERATION__?.__INSTANCES__?.find((i) => i.name === 'onecx_shell_ui')?.shareScopeMap
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

  private isAngularVersionBoundary(data: any): boolean {
    return data.from.startsWith('onecx_angular_') || (data.from === 'onecx_shell_ui' && data.useIn.length > 0)
  }
}
