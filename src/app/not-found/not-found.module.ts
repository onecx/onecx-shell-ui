import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { PageNotFoundComponent } from './components/not-found-page/not-found-page.component'

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    PageNotFoundComponent,
    RouterModule.forChild([
      {
        path: '',
        component: PageNotFoundComponent,
        title: 'OneCX Error'
      }
    ])
  ]
})
export class NotFoundModule {}
