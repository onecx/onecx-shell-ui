import { getOnecxTriggerElement } from './onecx-trigger-element.utils'
import { appendIntermediateStyleData, getStyleDataOrIntermediateStyleData } from './style-data.utils'

// When creating elements in Angular Material make sure to include the style id data in them so when appending to the body we don't lose context of the current App
export function ensureMaterialDynamicDataIncludesIntermediateStyleData() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createElementFromMaterial = function (context: any, tagName: any, options?: any): any {
    const el = document.createElement(tagName, options)
    const styleData = getStyleDataOrIntermediateStyleData(getOnecxTriggerElement())
    // Append intermediate data so the isolation does not happen by coincidence
    styleData && appendIntermediateStyleData(el, styleData)
    return el
  }
}
