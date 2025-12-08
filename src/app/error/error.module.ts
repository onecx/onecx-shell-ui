import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { ErrorPageComponent } from './components/error-page/error-page.component'

@NgModule({
  imports: [
    CommonModule,
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
