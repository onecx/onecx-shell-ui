import { AfterContentInit, Component, ElementRef, ViewChild } from '@angular/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import { firstValueFrom } from 'rxjs'

@Component({
  standalone: false,
  template: '<div #wrapper data-style-isolation></div>'
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
    element.dataset['styleId'] = styleId
    this.wrapper?.nativeElement.appendChild(element)
  }
}
