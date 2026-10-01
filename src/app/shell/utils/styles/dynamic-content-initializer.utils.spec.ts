import { CONFIG_KEY, ConfigurationService, POLYFILL_SCOPE_MODE } from '@onecx/angular-integration-interface'
import * as angularMaterial from './angular-material-overwrites.utils'
import * as bodyOverwrites from './body-overwrites.utils'
import { dynamicContentInitializer } from './dynamic-content-initializer.utils'
import * as dynamicContent from './dynamic-content.utils'
import * as triggerElement from './onecx-trigger-element.utils'
import * as primeNg from './primeng-overwrites.utils'
import * as sharedStyles from './shared-styles-host-overwrites.utils'

describe('dynamicContentInitializer', () => {
  beforeEach(() => jest.restoreAllMocks())

  it('initializes each DOM style integration with the configured polyfill mode', async () => {
    const mode = POLYFILL_SCOPE_MODE.PRECISION
    const getProperty = jest.fn().mockResolvedValue(mode) as ConfigurationService['getProperty']
    const configService = {
      getProperty
    } as unknown as ConfigurationService
    const initializeSharedStyles = jest.spyOn(sharedStyles, 'ensureAngularComponentStylesContainStyleId')
    const initializeBody = jest.spyOn(bodyOverwrites, 'ensureBodyChangesIncludeStyleData')
    const initializeElement = jest.spyOn(dynamicContent, 'ensureCreateOnecxElement')
    const initializeContainer = jest.spyOn(dynamicContent, 'ensureCreateOnecxDynamicContainer')
    const initializePrimeNg = jest.spyOn(primeNg, 'ensurePrimengDynamicDataIncludesIntermediateStyleData')
    const initializeMaterial = jest.spyOn(angularMaterial, 'ensureMaterialDynamicDataIncludesIntermediateStyleData')
    const initializeTrigger = jest.spyOn(triggerElement, 'initializeOnecxTriggerElementListener')

    await dynamicContentInitializer(configService)

    expect(configService.getProperty).toHaveBeenCalledWith(CONFIG_KEY.POLYFILL_SCOPE_MODE)
    expect(initializeSharedStyles).toHaveBeenCalledTimes(1)
    expect(initializeBody).toHaveBeenCalledWith(mode)
    expect(initializeElement).toHaveBeenCalledTimes(1)
    expect(initializeContainer).toHaveBeenCalledTimes(1)
    expect(initializePrimeNg).toHaveBeenCalledTimes(1)
    expect(initializeMaterial).toHaveBeenCalledTimes(1)
    expect(initializeTrigger).toHaveBeenCalledTimes(1)
  })
})
