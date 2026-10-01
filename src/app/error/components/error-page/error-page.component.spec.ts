import { Location } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { ErrorPageComponent } from './error-page.component'

jest.mock('@onecx/accelerator', () => {
  const actual = jest.requireActual('@onecx/accelerator')
  return {
    ...actual,
    getLocation: () => ({ origin: 'http://localhost', deploymentPath: '', applicationPath: '' })
  }
})

describe('ErrorPageComponent', () => {
  it('reads the requested path and reloads it under the deployment path', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '#reload' } } } }]
    })
    const component = TestBed.runInInjectionContext(() => new ErrorPageComponent())

    component.onReloadPage()

    expect(component.requestedApplicationPath).toBe('#reload')
    expect(window.location.hash).toBe('#reload')
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`)
  })

  it('uses an empty path when the route parameter is missing', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }]
    })

    expect(TestBed.runInInjectionContext(() => new ErrorPageComponent()).requestedApplicationPath).toBe('')
    expect(Location.joinWithSlash('/base', '/path')).toBe('/base/path')
  })
})
