import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WebcomponentLoaderComponent } from './webcomponent-loader.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [WebcomponentLoaderComponent],
  imports: [
    CommonModule,
    [
      RouterModule.forChild([
        { path: '**', component: WebcomponentLoaderComponent },
      ]),
    ],
  ],
})
export class WebcomponentLoaderModule {}
