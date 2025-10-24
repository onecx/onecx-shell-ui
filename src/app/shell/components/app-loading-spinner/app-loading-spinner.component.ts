import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  standalone: true,
  selector: 'ocx-shell-loading-spinner',
  templateUrl: 'app-loading-spinner.component.html',
  styleUrl: 'app-loading-spinner.component.scss',
  imports: [CommonModule],
})
export class AppLoadingSpinnerComponent {}
