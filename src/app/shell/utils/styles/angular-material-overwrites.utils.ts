import { getOnecxTriggerElement } from './onecx-trigger-element.utils'
import { appendIntermediateStyleData, getStyleDataOrIntermediateStyleData, markElement } from './style-data.utils'

// When creating elements in Angular Material make sure to include the style id data in them so when appending to the body we don't lose context of the current App
export function ensureMaterialDynamicDataIncludesIntermediateStyleData() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createElementFromMaterial = function (context: any, tagName: any, options?: any): HTMLElement {
    const el = document.createElement(tagName, options)
    // https://github.com/angular/components/blob/v21.2.8/src/cdk/overlay/overlay-container.ts#L33
    const platformIdAppName = context['this']?._platform?._platformId?.appElementName
    const platformIdElement = document.getElementsByTagName(platformIdAppName)[0]
    const onecxTrigger = getOnecxTriggerElement()
    const styleData =
      (platformIdElement ? getStyleDataOrIntermediateStyleData(platformIdElement) : null) ??
      (onecxTrigger ? getStyleDataOrIntermediateStyleData(onecxTrigger) : null)
    // Append intermediate data so the isolation does not happen by coincidence
    if (styleData) {
      appendIntermediateStyleData(el, styleData)
    }
    markElement(el, 'createElementFromMaterial')
    return el
  }
}
