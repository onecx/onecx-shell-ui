import { ensureAngularComponentStylesContainStyleId, MARKED_FOR_WRAPPING } from './shared-styles-host-overwrites.utils'

type DynamicDocument = Document & {
  createElementFromSharedStylesHost: (context: { this: object }, tagName: string) => HTMLElement
}

const dynamicDocument = document as DynamicDocument

describe('shared styles host overwrites utils', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
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

    const app = document.createElement('ocx-styled')
    app.dataset['styleId'] = 'product|app'
    document.body.appendChild(app)
    const style = dynamicDocument.createElementFromSharedStylesHost(
      { this: { appId: { appElementName: 'ocx-styled' } } },
      'style'
    )
    expect(style.dataset[MARKED_FOR_WRAPPING]).toBe('product|app')
    expect(warning).toHaveBeenCalledTimes(4)
  })
})
