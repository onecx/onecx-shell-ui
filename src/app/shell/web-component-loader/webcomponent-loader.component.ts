import { AfterContentInit, Component, ElementRef, ViewChild } from '@angular/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { dataMfeElementKey } from '@onecx/angular-utils'
import { firstValueFrom } from 'rxjs'
import { dataStyleIdKey, dataStyleIsolationKey } from 'src/scope-polyfill/utils'

@Component({
  standalone: false,
  template: '<div class="webcomponentwrapper" #wrapper></div>'
})
export class WebcomponentLoaderComponent implements AfterContentInit {
  @ViewChild('wrapper', { read: ElementRef, static: true })
  wrapper?: ElementRef

  constructor(private readonly appStateService: AppStateService) {}

  async ngAfterContentInit() {
    const currentMfe = await firstValueFrom(this.appStateService.currentMfe$.asObservable())

    if (!currentMfe.elementName) throw new Error('elementName is missing in the configuration')

    const styleId = `${currentMfe.productName}|${currentMfe.appId}`

    const element = document.createElement(currentMfe.elementName)
    element.dataset[dataStyleIdKey] = styleId
    element.dataset[dataStyleIsolationKey] = ''
    element.dataset[dataMfeElementKey] = ''
    this.wrapper?.nativeElement.appendChild(element)
  }
}
