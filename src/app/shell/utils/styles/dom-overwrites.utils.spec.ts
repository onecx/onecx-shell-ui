import { dataIntermediateStyleIdKey, dataStyleIdKey } from '@onecx/angular-utils'
jest.mock('@onecx/angular-utils/style', () => {
  const actual = jest.requireActual('@onecx/angular-utils/style')
  return { ...actual, getStyleDataFromInjector: jest.fn() }
})
import { getStyleDataFromInjector } from '@onecx/angular-utils/style'
import { ensureCreateOnecxDynamicContainer, ensureCreateOnecxElement } from './dynamic-content.utils'
import { ensureMaterialDynamicDataIncludesIntermediateStyleData } from './angular-material-overwrites.utils'
import { ensurePrimengDynamicDataIncludesIntermediateStyleData } from './primeng-overwrites.utils'
import { ensureAngularComponentStylesContainStyleId, MARKED_FOR_WRAPPING } from './shared-styles-host-overwrites.utils'

type MarkedElement = HTMLElement & { onecx?: { markers: string[] } }

type DynamicDocument = Document & {
  createOnecxElement: (context: { this: object }, tagName: string) => MarkedElement
  createOnecxDynamicContainer: (containerTagName: string, appElementName: string) => HTMLElement
  createElementFromMaterial: (context: { this: object }, tagName: string) => MarkedElement
  createElementFromPrimeNg: (context: { this: object }, tagName: string) => MarkedElement
  createElementFromSharedStylesHost: (context: { this: object }, tagName: string) => MarkedElement
}

const dynamicDocument = document as DynamicDocument

function styledElement(name = 'div'): HTMLElement {
  const element = document.createElement(name)
  element.dataset[dataStyleIdKey] = 'product|app'
  return element
}

describe('dynamic element style helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    globalThis.onecxTriggerElement = null
    jest.restoreAllMocks()
    jest.mocked(getStyleDataFromInjector).mockReset().mockReturnValue(null)
  })

  it('creates elements with style data from the injector or trigger element', () => {
    ensureCreateOnecxElement()
    const plain = dynamicDocument.createOnecxElement({ this: {} }, 'span')
    expect(plain.onecx?.markers).toContain('createOnecxElement')

    globalThis.onecxTriggerElement = styledElement()
    const fromTrigger = dynamicDocument.createOnecxElement({ this: {} }, 'button')
    expect(fromTrigger.dataset[dataIntermediateStyleIdKey]).toBe('product|app')

    jest.mocked(getStyleDataFromInjector).mockReturnValue({
      styleId: 'injector|app',
      noPortalLayoutStyles: undefined,
      mfeElement: undefined
    })
    globalThis.onecxTriggerElement = null
    const fromInjector = dynamicDocument.createOnecxElement({ this: {} }, 'i')
    expect(fromInjector.dataset[dataIntermediateStyleIdKey]).toBe('injector|app')
  })

  it('creates styled dynamic containers and warns when their source has no style data', () => {
    ensureCreateOnecxDynamicContainer()
    const app = styledElement('ocx-app')
    document.body.appendChild(app)
    const container = dynamicDocument.createOnecxDynamicContainer('section', 'ocx-app')
    expect(container.dataset[dataStyleIdKey]).toBe('product|app')
    expect(container.parentElement).toBe(document.body)

    const warning = jest.spyOn(console, 'warn').mockImplementation()
    const plainContainer = dynamicDocument.createOnecxDynamicContainer('section', 'missing-app')
    expect(plainContainer.dataset[dataStyleIdKey]).toBeUndefined()
    expect(warning).toHaveBeenCalledWith(
      'Could not find style data for app element, dynamic container will be created without style data',
      { elementName: 'missing-app' }
    )
  })

  it('adds intermediate style data to elements created by Angular Material and PrimeNG', () => {
    ensureMaterialDynamicDataIncludesIntermediateStyleData()
    ensurePrimengDynamicDataIncludesIntermediateStyleData()

    const plainMaterial = dynamicDocument.createElementFromMaterial({ this: {} }, 'span')
    expect(plainMaterial.dataset[dataIntermediateStyleIdKey]).toBeUndefined()

    const warning = jest.spyOn(console, 'warn').mockImplementation()
    const plainPrimeNg = dynamicDocument.createElementFromPrimeNg({ this: {} }, 'u')
    expect(plainPrimeNg.dataset[dataIntermediateStyleIdKey]).toBeUndefined()

    globalThis.onecxTriggerElement = styledElement()
    const material = dynamicDocument.createElementFromMaterial({ this: {} }, 'button')
    expect(material.dataset[dataIntermediateStyleIdKey]).toBe('product|app')

    const primeNg = dynamicDocument.createElementFromPrimeNg({ this: {} }, 'i')
    expect(primeNg.dataset[dataIntermediateStyleIdKey]).toBe('product|app')

    globalThis.onecxTriggerElement = null
    const contextElement = styledElement()
    const primeNgWithContext = dynamicDocument.createElementFromPrimeNg(
      { this: { el: { nativeElement: contextElement } } },
      'b'
    )
    expect(primeNgWithContext.dataset[dataIntermediateStyleIdKey]).toBe('product|app')
    warning.mockRestore()
  })

  it('marks shared Angular styles only when an app and style data can be found', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation()
    ensureAngularComponentStylesContainStyleId()

    const noApp = dynamicDocument.createElementFromSharedStylesHost({ this: {} }, 'style')
    expect(noApp.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()
    const noElementName = dynamicDocument.createElementFromSharedStylesHost({ this: { appId: {} } }, 'style')
    expect(noElementName.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()
    const appNotFound = dynamicDocument.createElementFromSharedStylesHost(
      { this: { appId: { appElementName: 'ocx-missing' } } },
      'style'
    )
    expect(appNotFound.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()

    const appWithoutStyle = document.createElement('ocx-no-style')
    document.body.appendChild(appWithoutStyle)
    const noStyle = dynamicDocument.createElementFromSharedStylesHost(
      { this: { appId: { appElementName: 'ocx-no-style' } } },
      'style'
    )
    expect(noStyle.dataset[MARKED_FOR_WRAPPING]).toBeUndefined()

    const app = styledElement('ocx-styled')
    document.body.appendChild(app)
    const style = dynamicDocument.createElementFromSharedStylesHost(
      { this: { appId: { appElementName: 'ocx-styled' } } },
      'style'
    )
    expect(style.dataset[MARKED_FOR_WRAPPING]).toBe('product|app')
    expect(style.onecx?.markers).toContain('ensureAngularComponentStylesContainStyleId')
    expect(warning).toHaveBeenCalledTimes(4)
  })
})
