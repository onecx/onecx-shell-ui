import { dataIntermediateStyleIdKey, dataStyleIdKey } from '@onecx/angular-utils'
import { getStyleDataFromInjector } from '@onecx/angular-utils/style'

import { ensureCreateOnecxDynamicContainer, ensureCreateOnecxElement } from './dynamic-content.utils'

jest.mock('@onecx/angular-utils/style', () => {
  const actual = jest.requireActual('@onecx/angular-utils/style')
  return { ...actual, getStyleDataFromInjector: jest.fn() }
})

type MarkedElement = HTMLElement & { onecx?: { markers: string[] } }

type DynamicDocument = Document & {
  createOnecxElement: (context: { this: object }, tagName: string) => MarkedElement
  createOnecxDynamicContainer: (containerTagName: string, appElementName: string) => HTMLElement
}

const dynamicDocument = document as DynamicDocument

describe('dynamic content utils', () => {
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

    const triggerElement = document.createElement('button')
    triggerElement.dataset[dataStyleIdKey] = 'product|app'
    globalThis.onecxTriggerElement = triggerElement
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
    const app = document.createElement('ocx-app')
    app.dataset[dataStyleIdKey] = 'product|app'
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
})
