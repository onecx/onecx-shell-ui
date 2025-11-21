import { DynamicAppId } from '@onecx/angular-webcomponents'
import { getStyleDataOrIntermediateStyleData, markElement } from './style-data.utils'

export const MARKED_FOR_WRAPPING = 'markedForWrapping'

// When creating style elements via Renderer from Angular Core, make sure to include the style id data in the style elements so when appending to the head we don't lose context of the current App
export function ensureAngularComponentStylesContainStyleId() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createElementFromSharedStylesHost = function (
    context: any,
    tagName: any,
    options?: any
  ): HTMLElement {
    const el = document.createElement(tagName, options)
    const sharedStylesHost = context['this']
    if (!sharedStylesHost?.appId) {
      console.warn('Expected to overwrite SharedStyleHost createElement method, but no appId found on context.')
      return el
    }
    const dynamicAppId = sharedStylesHost.appId
    if (!(dynamicAppId instanceof DynamicAppId)) {
      console.warn(
        'Expected to overwrite SharedStyleHost createElement method, but appId is not instance of DynamicAppId.'
      )
      return el
    }
    const contextElementName = dynamicAppId.appElementName
    const contextElement = document.getElementsByTagName(contextElementName)[0]
    if (!contextElement) {
      console.warn(
        `Expected to overwrite SharedStyleHost createElement method, but could not find context element for Angular component styles: ${contextElementName}`
      )
      return el
    }
    const styleData = contextElement ? getStyleDataOrIntermediateStyleData(contextElement) : null
    if (!styleData) {
      console.warn(
        `Expected to overwrite SharedStyleHost createElement method, but could not find style data for Angular component styles in context element: ${contextElementName}`
      )
      return el
    }
    el.dataset[MARKED_FOR_WRAPPING] = styleData.styleId
    markElement(el, 'ensureAngularComponentStylesContainStyleId')

    return el
  }
}
