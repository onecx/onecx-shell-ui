import { getOnecxTriggerElement } from './onecx-trigger-element.utils'
import { appendIntermediateStyleData, getStyleDataOrIntermediateStyleData, markElement } from './style-data.utils'

// When creating elements in PrimeNg make sure to include the style id data in them so when appending to the body we don't lose context of the current App
export function ensurePrimengDynamicDataIncludesIntermediateStyleData() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createElementFromPrimeNg = function (context: any, tagName: any, options?: any): HTMLElement {
    const el = document.createElement(tagName, options)
    const contextElement = context['this']?.el?.nativeElement
    // https://github.com/primefaces/primeng/blob/451ca1574e6538e15e4a50305254d3c86c55b434/packages/primeng/src/basecomponent/basecomponent.ts#L19
    const platformIdAppName = context['this']?.platformId?.appElementName
    const platformIdElement = document.getElementsByName(platformIdAppName)[0]
    const onecxTrigger = getOnecxTriggerElement()
    const styleData =
      (contextElement ? getStyleDataOrIntermediateStyleData(contextElement) : null) ??
      (platformIdElement ? getStyleDataOrIntermediateStyleData(platformIdElement) : null) ??
      (onecxTrigger ? getStyleDataOrIntermediateStyleData(onecxTrigger) : null)
    // Append intermediate data so the isolation does not happen by coincidence
    if (styleData) {
      appendIntermediateStyleData(el, styleData)
    }
    markElement(el, 'createElementFromPrimeNg')
    return el
  }
}
