import { dataIntermediateStyleIdKey } from '@onecx/angular-utils'

import { ensureMaterialDynamicDataIncludesIntermediateStyleData } from './angular-material-overwrites.utils'

type MarkedElement = HTMLElement & { onecx?: { markers: string[] } }

type DynamicDocument = Document & {
  createElementFromMaterial: (context: { this: object }, tagName: string) => MarkedElement
}

const dynamicDocument = document as DynamicDocument

describe('angular material overwrites utils', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    globalThis.onecxTriggerElement = null
    jest.restoreAllMocks()
  })

  it('adds intermediate style data to elements created by Angular Material', () => {
    ensureMaterialDynamicDataIncludesIntermediateStyleData()

    const plainMaterial = dynamicDocument.createElementFromMaterial({ this: {} }, 'span')
    expect(plainMaterial.dataset[dataIntermediateStyleIdKey]).toBeUndefined()

    const triggerElement = document.createElement('button')
    triggerElement.dataset['styleId'] = 'product|app'
    globalThis.onecxTriggerElement = triggerElement
    const material = dynamicDocument.createElementFromMaterial({ this: {} }, 'button')
    expect(material.dataset[dataIntermediateStyleIdKey]).toBe('product|app')
  })
})
