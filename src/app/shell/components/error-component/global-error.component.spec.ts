import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'

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
})
