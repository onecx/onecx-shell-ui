import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { PageNotFoundComponent } from './components/not-found-page/not-found-page.component'

@NgModule({
  imports: [
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
