import { TestBed, ComponentFixture } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { TooltipModule } from 'primeng/tooltip'
import { firstValueFrom, of } from 'rxjs'

import { provideTranslateTestingService } from '@onecx/angular-testing'

import { InitializationErrorPageComponent } from './initialization-error-page.component'

describe('InitializationErrorPageComponent', () => {
  let component: InitializationErrorPageComponent
  let fixture: ComponentFixture<InitializationErrorPageComponent>
  let route: ActivatedRoute

  const fragmentParams = {
    message: 'Test Error',
    requestedUrl: 'http://example.com',
    detail: 'Detail message',
    errorCode: '404',
    invalidParams: '[param1: Invalid]',
    params: '[key1: value1]'
  }

  beforeEach(() => {
    route = {
      fragment: of(new URLSearchParams(fragmentParams).toString())
    } as any

    TestBed.configureTestingModule({
      declarations: [],
      imports: [InitializationErrorPageComponent, TooltipModule],
      providers: [{ provide: ActivatedRoute, useValue: route }, provideTranslateTestingService({})]
    }).compileComponents()

    fixture = TestBed.createComponent(InitializationErrorPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('display', () => {
    beforeEach(() => {
      route = {
        fragment: of(new URLSearchParams(fragmentParams).toString())
      } as any
    })

    it('should display the error details in the template', () => {
      fixture.detectChanges()
      const compiled = fixture.nativeElement as HTMLElement

      expect(compiled.querySelector('#onecxInitializationErrorMessage')?.textContent).toContain('Test Error')
      expect(compiled.querySelector('#onecxInitializationErrorRequestedUrl')?.textContent).toContain(
        'http://example.com'
      )
      expect(compiled.querySelector('#onecxInitializationErrorDetail')?.textContent).toContain('Detail message')
      expect(compiled.querySelector('#onecxInitializationErrorErrorCode')?.textContent).toContain('404')
      expect(compiled.querySelector('#onecxInitializationErrorInvalidParams')?.textContent).toContain(
        '[param1: Invalid]'
      )
      expect(compiled.querySelector('#onecxInitializationErrorParams')?.textContent).toContain('[key1: value1]')
    })
  })

  describe('reflow', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(280)

    beforeEach(() => {
      Object.assign(route, {
        fragment: of(new URLSearchParams({ ...fragmentParams, requestedUrl: longUrl }).toString())
      })
      fixture = TestBed.createComponent(InitializationErrorPageComponent)
      fixture.detectChanges()
    })

    it('renders a 300-character URL completely in a wrapping value element', () => {
      const compiled = fixture.nativeElement as HTMLElement
      const value = compiled.querySelector('#onecxInitializationErrorRequestedUrl .onecx-init-error-value')

      expect(longUrl).toHaveLength(300)
      expect(value?.textContent).toBe(longUrl)
      expect(compiled.querySelectorAll('.onecx-init-error-value')).toHaveLength(Object.keys(fragmentParams).length)
    })

    it('keeps the "Log out" button available and constrained to the page width', () => {
      const compiled = fixture.nativeElement as HTMLElement
      const button = compiled.querySelector('section.onecx-init-error button.onecx-init-error-logout')

      expect(button?.textContent?.trim()).toBe('LOGOUT')
    })
  })

  it('should publish logout event', () => {
    jest.spyOn(component.eventsTopic, 'publish')

    component.onLogout()

    expect(component.eventsTopic.publish).toHaveBeenCalledWith({
      type: 'authentication#logoutButtonClicked'
    })
  })

  it('defaults missing fragment values to empty strings', async () => {
    Object.assign(route, { fragment: of(null) })
    const emptyFragmentComponent = TestBed.runInInjectionContext(() => new InitializationErrorPageComponent())

    await expect(firstValueFrom(emptyFragmentComponent.error$)).resolves.toEqual({
      message: '',
      requestedUrl: '',
      detail: null,
      errorCode: null,
      params: null,
      invalidParams: null
    })

    emptyFragmentComponent.ngOnDestroy()
  })
})
