import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { WebcomponentLoaderComponent } from './webcomponent-loader.component'

@NgModule({
  declarations: [WebcomponentLoaderComponent],
  imports: [[RouterModule.forChild([{ path: '**', component: WebcomponentLoaderComponent }])]]
})
export class WebcomponentLoaderModule {}
