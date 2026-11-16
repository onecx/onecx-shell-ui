import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  selector: 'ocx-shell-loading-spinner',
  templateUrl: 'app-loading-spinner.component.html',
  styleUrl: 'app-loading-spinner.component.scss'
})
export class AppLoadingSpinnerComponent {}
