import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'

import { HomeComponent } from './components/home/home.component'
import { WelcomeMessageComponent } from './components/welcome-message-component/welcome-message.component'

@NgModule({
  imports: [
    CommonModule,
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
