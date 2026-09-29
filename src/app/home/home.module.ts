import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { HomeComponent } from './components/home/home.component'
import { WelcomeMessageComponent } from './components/welcome-message-component/welcome-message.component'

@NgModule({
  imports: [
    HomeComponent,
    WelcomeMessageComponent,
    RouterModule.forChild([
      {
        path: '',
        component: HomeComponent
      }
    ])
  ]
})
export class HomeModule {}
