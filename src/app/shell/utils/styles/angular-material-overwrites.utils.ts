import { getStyleDataOrIntermediateStyleData } from '@onecx/angular-utils/style'
import { getOnecxTriggerElement } from './onecx-trigger-element.utils'
import { appendIntermediateStyleData, markElement } from './style-data.utils'

/**
 * @deprecated - functionality replaced by ensureDynamicDataIncludesIntermediateStyleData, which should be used for all dynamic element creation, including PrimeNg, Angular Material, and any custom dynamic element creation. This function is still added to document to not break existing functionality, but should not be used for any new dynamic element creation.
 *
 * When creating elements in Angular Material make sure to include the style id data in them so when appending to the body we don't lose context of the current App
 */
export function ensureMaterialDynamicDataIncludesIntermediateStyleData() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createElementFromMaterial = function (context: any, tagName: any, options?: any): HTMLElement {
    const el = document.createElement(tagName, options)
    const onecxTrigger = getOnecxTriggerElement()
    const styleData = onecxTrigger ? getStyleDataOrIntermediateStyleData(onecxTrigger) : null
    // Append intermediate data so the isolation does not happen by coincidence
    if (styleData) {
      appendIntermediateStyleData(el, styleData)
    }
    markElement(el, 'createElementFromMaterial')
    return el
  }
}
