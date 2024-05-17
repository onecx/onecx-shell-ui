import {
  AfterContentInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { AppStateService } from '@onecx/angular-integration-interface';
import { firstValueFrom } from 'rxjs';

@Component({
  template: '<div #wrapper></div>',
})
export class WebcomponentLoaderComponent implements AfterContentInit {
  @ViewChild('wrapper', { read: ElementRef, static: true })
  wrapper?: ElementRef;

  constructor( private appStateService: AppStateService,) {}

  async ngAfterContentInit() {
    
    const currentMfe = await firstValueFrom(this.appStateService.currentMfe$.asObservable());

    if (!currentMfe.remoteName)
      throw new Error(
        'The remote of the current MFE is not set correctly.\n' +
          'The remoteName should be supplied after the "=" sign.\n' +
          'Example: { "remote":"http://host:port/basePath/my-react-app/#./Module=my-react-app" }'
      );

    const element = document.createElement(currentMfe.remoteName);
    this.wrapper?.nativeElement.appendChild(element);
  }
}
