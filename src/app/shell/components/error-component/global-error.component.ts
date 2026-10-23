import { AfterViewInit, Component, ElementRef, Input, ViewChild, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  standalone: true,
  imports: [TranslateModule],
  selector: 'ocx-shell-error',
  templateUrl: './global-error.component.html',
  styleUrl: './global-error.component.scss'
})
export class GlobalErrorComponent implements AfterViewInit {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  @ViewChild('heading', { static: true })
  heading?: ElementRef<HTMLElement>

  @Input()
  errCode: string | undefined
  backUrl: string

  constructor() {
    this.errCode = this.route.snapshot.queryParamMap.get('err') || 'E1001_FAILED_START'
    this.backUrl = this.route.snapshot.queryParamMap.get('return') || '/'
  }

  ngAfterViewInit() {
    // Move focus to the heading so assistive technology announces the error when the view appears
    this.heading?.nativeElement.focus()
  }

  onGoBack() {
    this.router.navigateByUrl(this.backUrl)
  }

  reload() {
    globalThis.location.reload()
  }
}
