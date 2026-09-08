import { dataOnecxDynamicContainerKey } from '@onecx/angular-utils'
import { getOnecxTriggerElement } from './onecx-trigger-element.utils'
import { appendIntermediateStyleData, appendStyleData, markElement } from './style-data.utils'
import { getStyleDataFromInjector, getStyleDataOrIntermediateStyleData } from '@onecx/angular-utils/style'

/**
 * This function ensures that the `createOnecxElement` function is available on the `document` object. It is used to create elements with the appropriate style data attached, ensuring that the styles are correctly applied in a dynamic content context.
 *
 * The style data is retrieved from the contexts in the following order:
 * 1. From the injector of the calling context (if available).
 * 2. From the `onecxTrigger` element (if available).
 *
 * If style data is found, it is appended to the newly created element to prevent style isolation issues.
 */
export function ensureCreateOnecxElement() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createOnecxElement = function (context: any, tagName: any, options?: any): HTMLElement {
    const el = document.createElement(tagName, options)
    const calleeObject = context['this']
    const injectedStyleData = getStyleDataFromInjector(calleeObject)
    const onecxTrigger = getOnecxTriggerElement()
    const styleData = injectedStyleData ?? (onecxTrigger ? getStyleDataOrIntermediateStyleData(onecxTrigger) : null)
    // Append intermediate data so the isolation does not happen by coincidence
    if (styleData) {
      appendIntermediateStyleData(el, styleData)
    }
    markElement(el, 'createOnecxElement')
    return el
  }
}

/**
 * This function ensures that the `createOnecxDynamicContainer` function is available on the `document` object. It is used to create a dynamic container element with the appropriate style data attached, ensuring that the styles are correctly applied in a dynamic content context.
 *
 * The style data is retrieved from the application element specified by the `appElementName` parameter. If style data is found, it is appended to the newly created container element to prevent style isolation issues.
 */
export function ensureCreateOnecxDynamicContainer() {
  // eslint-disable-next-line @typescript-eslint/no-extra-semi
  ;(document as any).createOnecxDynamicContainer = function (
    containerTagName: string,
    appElementName: string
  ): HTMLElement {
    const container = document.createElement(containerTagName)
    const appElement = document.getElementsByTagName(appElementName)[0] as HTMLElement
    const appStyleData = getStyleDataOrIntermediateStyleData(appElement)
    if (appStyleData) {
      appendStyleData(container, appStyleData)
    } else {
      console.warn('Could not find style data for app element, dynamic container will be created without style data', {
        elementName: appElementName
      })
    }
    container.dataset[dataOnecxDynamicContainerKey] = ''
    markElement(container, 'createOnecxDynamicContainer')
    document.body.appendChild(container)
    return container
  }
}
