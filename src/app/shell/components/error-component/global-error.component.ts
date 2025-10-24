import { Component, Input, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'

@Component({
  standalone: true,
  selector: 'ocx-shell-error',
  templateUrl: './global-error.component.html',
  styleUrls: ['./global-error.component.scss'],
  imports: [CommonModule, RouterModule],
})
export class GlobalErrorComponent {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  @Input()
  errCode: string | undefined
  backUrl: string

  constructor() {
    this.errCode = this.route.snapshot.queryParamMap.get('err') || 'E1001_FAILED_START'
    this.backUrl = this.route.snapshot.queryParamMap.get('return') || '/'
  }

  onGoBack() {
    this.router.navigateByUrl(this.backUrl)
  }

  reload() {
    window.location.reload()
  }
}
