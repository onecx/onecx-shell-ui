import { TestBed, ComponentFixture } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { of } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

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
      declarations: [InitializationErrorPageComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('../../../../assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [{ provide: ActivatedRoute, useValue: route }]
    }).compileComponents()

    fixture = TestBed.createComponent(InitializationErrorPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should display the error details in the template', () => {
    fixture.detectChanges()
    const compiled = fixture.nativeElement as HTMLElement

    expect(compiled.querySelector('#onecxInitializationErrorMessage')?.textContent).toContain('Test Error')
    expect(compiled.querySelector('#onecxInitializationErrorRequestedUrl')?.textContent).toContain('http://example.com')
    expect(compiled.querySelector('#onecxInitializationErrorDetail')?.textContent).toContain('Detail message')
    expect(compiled.querySelector('#onecxInitializationErrorErrorCode')?.textContent).toContain('404')
    expect(compiled.querySelector('#onecxInitializationErrorInvalidParams')?.textContent).toContain('[param1: Invalid]')
    expect(compiled.querySelector('#onecxInitializationErrorParams')?.textContent).toContain('[key1: value1]')
  })
})
