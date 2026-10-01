import { TestBed } from '@angular/core/testing'
import { UserService } from '@onecx/angular-integration-interface'
import { TranslateService } from '@ngx-translate/core'
import { PrimeNG } from 'primeng/config'
import { Subject, of } from 'rxjs'
import { AppComponent } from './app.component'

describe('AppComponent', () => {
  it('applies the user language and refreshes PrimeNG translations on translation changes', () => {
    const language$ = new Subject<string>()
    const langChanges$ = new Subject()
    const translationChanges$ = new Subject()
    const fallbackChanges$ = new Subject()
    const translate = {
      use: jest.fn(),
      get: jest.fn(() => of({ buttonLabel: 'Continue' })),
      onLangChange: langChanges$,
      onTranslationChange: translationChanges$,
      onFallbackLangChange: fallbackChanges$
    }
    const primeNg = { setTranslation: jest.fn() }

    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { lang$: language$ } },
        { provide: TranslateService, useValue: translate },
        { provide: PrimeNG, useValue: primeNg }
      ]
    })

    const component = TestBed.runInInjectionContext(() => new AppComponent())
    component.ngOnInit()

    language$.next('de')
    expect(document.documentElement.lang).toBe('de')
    expect(translate.use).toHaveBeenCalledWith('de')

    langChanges$.next({})
    translationChanges$.next({})
    fallbackChanges$.next({})

    expect(translate.get).toHaveBeenCalledTimes(3)
    expect(primeNg.setTranslation).toHaveBeenCalledTimes(3)
    expect(primeNg.setTranslation).toHaveBeenCalledWith({ buttonLabel: 'Continue' })
  })
})
