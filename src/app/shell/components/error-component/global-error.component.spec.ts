import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

import { GlobalErrorComponent } from './global-error.component'

describe('GlobalErrorComponent', () => {
  it('uses route values, navigates back, and reloads the page', () => {
    const navigateByUrl = jest.fn()
    const jsdomError = jest.spyOn(console, 'error').mockImplementation()
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (key: string) => (key === 'err' ? 'E1000' : '/home') } } }
        }
      ]
    })
    const component = TestBed.runInInjectionContext(() => new GlobalErrorComponent())

    component.onGoBack()
    expect(() => component.reload()).not.toThrow()

    expect(component.errCode).toBe('E1000')
    expect(component.backUrl).toBe('/home')
    expect(navigateByUrl).toHaveBeenCalledWith('/home')
    expect(jsdomError).toHaveBeenCalled()
    jsdomError.mockRestore()
  })

  it('uses the fallback route values when query parameters are missing', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigateByUrl: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } }
      ]
    })

    const component = TestBed.runInInjectionContext(() => new GlobalErrorComponent())
    expect(component.errCode).toBe('E1001_FAILED_START')
    expect(component.backUrl).toBe('/')
  })

  describe('rendering', () => {
    function render(lang: 'en' | 'de') {
      TestBed.configureTestingModule({
        imports: [GlobalErrorComponent, TranslateModule.forRoot()],
        providers: [
          { provide: Router, useValue: { navigateByUrl: jest.fn() } },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => 'E42' } } } }
        ]
      })
      const translate = TestBed.inject(TranslateService)
      translate.setTranslation('en', {
        GLOBAL_ERROR: {
          TITLE: 'Something went wrong',
          DESCRIPTION: 'desc',
          ERROR_CODE: 'Error code:',
          ACTION: 'Try again'
        }
      })
      translate.setTranslation('de', {
        GLOBAL_ERROR: {
          TITLE: 'Etwas ist schiefgelaufen',
          DESCRIPTION: 'desc',
          ERROR_CODE: 'Fehlercode:',
          ACTION: 'Erneut versuchen'
        }
      })
      translate.use(lang)
      const fixture = TestBed.createComponent(GlobalErrorComponent)
      document.body.appendChild(fixture.nativeElement)
      fixture.detectChanges()
      return fixture
    }

    it('renders no own main landmark, a level 1 heading and a named button', () => {
      const fixture = render('en')
      const el: HTMLElement = fixture.nativeElement
      // the shell frame (portal viewport) provides the single main landmark
      expect(el.querySelector('main')).toBeNull()
      expect(el.querySelectorAll('h1')).toHaveLength(1)
      expect(el.querySelector('h1')?.textContent?.trim()).toBe('Something went wrong')
      expect(el.querySelector('button')?.textContent?.trim()).toBe('Try again')
      expect(el.textContent).toContain('E42')
      fixture.nativeElement.remove()
    })

    it('translates the button name to German', () => {
      const fixture = render('de')
      expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('Erneut versuchen')
      fixture.nativeElement.remove()
    })

    it('moves focus to the heading and requests no image', () => {
      const fixture = render('en')
      const h1 = fixture.nativeElement.querySelector('h1')
      expect(document.activeElement).toBe(h1)
      expect(h1.getAttribute('tabindex')).toBe('-1')
      expect(fixture.nativeElement.querySelector('img')).toBeNull()
      fixture.nativeElement.remove()
    })
  })
})
