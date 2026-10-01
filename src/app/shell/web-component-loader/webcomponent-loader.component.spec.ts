import { ElementRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { AppStateService } from '@onecx/angular-integration-interface'
import { dataMfeElementKey } from '@onecx/angular-utils'
import { of } from 'rxjs'
import { dataStyleIdKey, dataStyleIsolationKey } from 'src/scope-polyfill/utils'
import { WebcomponentLoaderComponent } from './webcomponent-loader.component'
import { WebcomponentLoaderModule } from './webcomponent-loader.module'

describe('WebcomponentLoaderComponent', () => {
  it('adds a configured remote element with style isolation attributes', async () => {
    TestBed.configureTestingModule({
      declarations: [WebcomponentLoaderComponent],
      providers: [
        {
          provide: AppStateService,
          useValue: {
            currentMfe$: { asObservable: () => of({ appId: 'app', productName: 'product', elementName: 'remote-tag' }) }
          }
        }
      ]
    })
    const fixture = TestBed.createComponent(WebcomponentLoaderComponent)
    const wrapper = document.createElement('div')
    fixture.componentInstance.wrapper = new ElementRef(wrapper)

    await fixture.componentInstance.ngAfterContentInit()

    const element = wrapper.firstElementChild as HTMLElement
    expect(element.tagName.toLowerCase()).toBe('remote-tag')
    expect(element.dataset[dataStyleIdKey]).toBe('product|app')
    expect(element.dataset[dataStyleIsolationKey]).toBe('')
    expect(element.dataset[dataMfeElementKey]).toBe('')
  })

  it('does not append if the optional wrapper is absent', async () => {
    TestBed.configureTestingModule({
      declarations: [WebcomponentLoaderComponent],
      providers: [
        {
          provide: AppStateService,
          useValue: { currentMfe$: { asObservable: () => of({ elementName: 'remote-tag' }) } }
        }
      ]
    })
    const fixture = TestBed.createComponent(WebcomponentLoaderComponent)

    await expect(fixture.componentInstance.ngAfterContentInit()).resolves.toBeUndefined()
  })

  it('rejects configurations without an element name', async () => {
    TestBed.configureTestingModule({
      declarations: [WebcomponentLoaderComponent],
      providers: [
        {
          provide: AppStateService,
          useValue: { currentMfe$: { asObservable: () => of({}) } }
        }
      ]
    })
    const fixture = TestBed.createComponent(WebcomponentLoaderComponent)

    await expect(fixture.componentInstance.ngAfterContentInit()).rejects.toThrow(
      'elementName is missing in the configuration'
    )
  })

  it('exports the loader module', () => {
    expect(new WebcomponentLoaderModule()).toBeInstanceOf(WebcomponentLoaderModule)
  })
})
