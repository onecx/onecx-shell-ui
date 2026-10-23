import { LiveAnnouncer } from '@angular/cdk/a11y'
import { TestBed } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { of, Subject, throwError } from 'rxjs'

import { AppLoadingSpinnerComponent, LOADING_ANNOUNCE_DELAY_MS } from './app-loading-spinner.component'

describe('AppLoadingSpinnerComponent', () => {
  let announce: jest.Mock
  let get: jest.Mock

  const createSpinner = () => {
    const fixture = TestBed.createComponent(AppLoadingSpinnerComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    jest.useFakeTimers()
    announce = jest.fn().mockResolvedValue(undefined)
    get = jest.fn(() => of('Loading'))
    TestBed.configureTestingModule({
      imports: [AppLoadingSpinnerComponent],
      providers: [
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: TranslateService, useValue: { get } }
      ]
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders a purely visual overlay without roles or live regions', () => {
    const fixture = createSpinner()
    const root: HTMLElement = fixture.nativeElement
    const overlay = root.querySelector('[data-testid="ocx-shell-loading-spinner"]')

    expect(overlay?.getAttribute('aria-hidden')).toBe('true')
    expect(root.querySelector('[role], [aria-live], [tabindex], a, button, input')).toBeNull()
    fixture.destroy()
  })

  it('keeps the visible loading text inside the aria-hidden overlay, so it is not announced twice', () => {
    const fixture = createSpinner()
    const root: HTMLElement = fixture.nativeElement
    const text = root.querySelector('[data-testid="ocx-shell-loading-spinner-text"]')

    expect(text?.textContent?.trim()).toBe('Loading')
    expect(text?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(root.textContent?.trim()).toBe('Loading')
    fixture.destroy()
  })

  it('shows the English loading text when the translation fails', () => {
    get.mockReturnValue(throwError(() => new Error('no translations')))
    const fixture = createSpinner()
    const text = fixture.nativeElement.querySelector('[data-testid="ocx-shell-loading-spinner-text"]')

    expect(text?.textContent?.trim()).toBe('Loading')
    fixture.destroy()
  })

  it('requests the translation only once for the visible text and the announcement', async () => {
    const fixture = createSpinner()

    await jest.advanceTimersByTimeAsync(LOADING_ANNOUNCE_DELAY_MS)
    expect(get).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith('Loading', 'polite')
    fixture.destroy()
  })

  it('announces "Loading" once, politely, when loading takes longer than the delay', async () => {
    const fixture = createSpinner()

    await jest.advanceTimersByTimeAsync(LOADING_ANNOUNCE_DELAY_MS - 1)
    expect(announce).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(1)
    expect(get).toHaveBeenCalledWith('LOADING')
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith('Loading', 'polite')

    await jest.advanceTimersByTimeAsync(10 * LOADING_ANNOUNCE_DELAY_MS)
    expect(announce).toHaveBeenCalledTimes(1)
    fixture.destroy()
  })

  it('falls back to "Loading" when the translation fails', async () => {
    get.mockReturnValue(throwError(() => new Error('no translations')))
    const fixture = createSpinner()

    await jest.advanceTimersByTimeAsync(LOADING_ANNOUNCE_DELAY_MS)
    expect(announce).toHaveBeenCalledWith('Loading', 'polite')
    fixture.destroy()
  })

  it('does not announce when loading finishes before the delay', async () => {
    const fixture = createSpinner()
    fixture.destroy()

    await jest.advanceTimersByTimeAsync(2 * LOADING_ANNOUNCE_DELAY_MS)
    expect(announce).not.toHaveBeenCalled()
  })

  it('does not announce when loading finishes while the message is being translated', async () => {
    const translation$ = new Subject<string>()
    get.mockReturnValue(translation$)
    const fixture = createSpinner()

    await jest.advanceTimersByTimeAsync(LOADING_ANNOUNCE_DELAY_MS)
    fixture.destroy()
    translation$.next('Loading')
    await jest.advanceTimersByTimeAsync(0)

    expect(announce).not.toHaveBeenCalled()
  })
})
