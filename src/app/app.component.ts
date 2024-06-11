import { Component, NgZone, inject } from '@angular/core';

@Component({
  selector: 'ocx-shell-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'shell';
  constructor() {
    (globalThis as any).ngZone = inject(NgZone);
  }
}
