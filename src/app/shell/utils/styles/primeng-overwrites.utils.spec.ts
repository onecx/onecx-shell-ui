import { dataIntermediateStyleIdKey } from '@onecx/angular-utils'

import { ensurePrimengDynamicDataIncludesIntermediateStyleData } from './primeng-overwrites.utils'

type MarkedElement = HTMLElement & { onecx?: { markers: string[] } }

type DynamicDocument = Document & {
  createElementFromPrimeNg: (context: { this: object }, tagName: string) => MarkedElement
}

const dynamicDocument = document as DynamicDocument

describe('primeNg overwrites utils', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    globalThis.onecxTriggerElement = null
    jest.restoreAllMocks()
  })

  it('adds intermediate style data to elements created by PrimeNG', () => {
    ensurePrimengDynamicDataIncludesIntermediateStyleData()

    const plainPrimeNg = dynamicDocument.createElementFromPrimeNg({ this: {} }, 'u')
    expect(plainPrimeNg.dataset[dataIntermediateStyleIdKey]).toBeUndefined()

    const warning = jest.spyOn(console, 'warn').mockImplementation()
    const triggerElement = document.createElement('i')
    triggerElement.dataset['styleId'] = 'product|app'
    globalThis.onecxTriggerElement = triggerElement
    const primeNg = dynamicDocument.createElementFromPrimeNg({ this: {} }, 'i')
    expect(primeNg.dataset[dataIntermediateStyleIdKey]).toBe('product|app')

    globalThis.onecxTriggerElement = null
    const contextElement = document.createElement('b')
    contextElement.dataset['styleId'] = 'product|app'
    const primeNgWithContext = dynamicDocument.createElementFromPrimeNg(
      { this: { el: { nativeElement: contextElement } } },
      'b'
    )
    expect(primeNgWithContext.dataset[dataIntermediateStyleIdKey]).toBe('product|app')
    warning.mockRestore()
  })
})
