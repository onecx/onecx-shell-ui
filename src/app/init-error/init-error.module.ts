import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { InitializationErrorPageComponent } from './components/initialization-error-page/initialization-error-page.component'

@NgModule({
  imports: [
    CommonModule,
    InitializationErrorPageComponent,
    TranslateModule,
    RouterModule.forChild([
      {
        path: '',
        component: InitializationErrorPageComponent,
        title: 'Initialization Error'
      }
    ])
  ]
})
export class InitErrorModule {}
