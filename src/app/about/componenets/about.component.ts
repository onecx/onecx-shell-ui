import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

interface AngularVersion {
  name: string,
  version: string,
  from: string,
  eager: boolean,
  loaded?: number,
}

const magicChar = String.fromCodePoint(0x10ffff) // Magic character for preloaders

@Component({
  standalone: true,
  imports: [CommonModule, TranslateModule],
  selector: 'ocx-shell-about',
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit {
  supportedAngularVersions: AngularVersion[] = []

  ngOnInit(){
    this.loadSupportedVersions()
  }

  private loadSupportedVersions(){
    try {
      Object.entries((globalThis as any).onecxWebpackContainer?.default['@angular/core'] || {}).forEach(([version, data]: [string, any]) => {
        if (data.from.startsWith(magicChar)) {
          this.supportedAngularVersions.push({
            name: "Angular " + version.substring(0, version.indexOf('.')),
            version: version,
            from: data.from.replace(magicChar, ''),
            eager: data['eager'],
            loaded: data['loaded'] || 0,
          });
        }
      });
    } catch (error) {
      console.error('Error while accessing onecxWebpackContainer :', error);
    }
  }
}
