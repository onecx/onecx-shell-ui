import { CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { ensurePrimengDynamicDataIncludesIntermediateStyleData } from './primeng-overwrites.utils'
import { ensureBodyChangesIncludeStyleData } from './body-overwrites.utils'
import { ensureMaterialDynamicDataIncludesIntermediateStyleData } from './angular-material-overwrites.utils'
import { initializeOnecxTriggerElementListener } from './onecx-trigger-element.utils'
import { ensureAngularComponentStylesContainStyleId } from './shared-styles-host-overwrites.utils'
import { dataOnecxDynamicContainerKey } from '@onecx/angular-utils'
import { getOnecxTriggerElement } from './onecx-trigger-element.utils'
import { appendIntermediateStyleData, appendStyleData, markElement } from './style-data.utils'
import { getStyleDataFromInjector, getStyleDataOrIntermediateStyleData } from '@onecx/angular-utils/style'

export async function dynamicContentInitializer(configService: ConfigurationService) {
  const polyfillMode = await configService.getProperty(CONFIG_KEY.POLYFILL_SCOPE_MODE)
  ensureAngularComponentStylesContainStyleId()
  ensureBodyChangesIncludeStyleData(polyfillMode)
  ensureDynamicDataIncludesIntermediateStyleData()
  ensurePrimengDynamicDataIncludesIntermediateStyleData()
  ensureMaterialDynamicDataIncludesIntermediateStyleData()
  ensureApplicationDynamicContainer()
  initializeOnecxTriggerElementListener()
}

// When creating elements make sure to include the style id data in them so when appending to the body we don't lose context of the current App
export function ensureDynamicDataIncludesIntermediateStyleData() {
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

export function ensureApplicationDynamicContainer() {
  (document as any).createOnecxDynamicContainer = function (
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
