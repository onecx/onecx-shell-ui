import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { ErrorPageComponent } from './components/error-page/error-page.component'

@NgModule({
  imports: [
    TranslateModule,
    ErrorPageComponent,
    RouterModule.forChild([
      {
        path: '',
        component: ErrorPageComponent,
        title: 'Error'
      }
    ])
  ]
})
export class ErrorModule {}
