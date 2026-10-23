import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { InitializationErrorPageComponent } from './components/initialization-error-page/initialization-error-page.component'

@NgModule({
  imports: [
    InitializationErrorPageComponent,
    TranslateModule,
    RouterModule.forChild([
      {
        path: '',
        component: InitializationErrorPageComponent,
        title: 'PAGE_TITLES.INITIALIZATION_ERROR'
      }
    ])
  ]
})
export class InitErrorModule {}
