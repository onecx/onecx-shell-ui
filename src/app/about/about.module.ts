import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AboutComponent } from './componenets/about.component'
import { TranslateModule } from '@ngx-translate/core'

const routes: Routes = [
  {
    path: '',
    component: AboutComponent,
    title: 'About'
  }
]

@NgModule({
  imports: [TranslateModule, AboutComponent, RouterModule.forChild(routes)]
})
export class AboutModule {}
