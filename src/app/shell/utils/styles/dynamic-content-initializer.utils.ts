import { CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import { ensurePrimengDynamicDataIncludesIntermediateStyleData } from './primeng-overwrites.utils'
import { ensureBodyChangesIncludeStyleData } from './body-overwrites.utils'
import { ensureMaterialDynamicDataIncludesIntermediateStyleData } from './angular-material-overwrites.utils'
import { initializeOnecxTriggerElementListener } from './onecx-trigger-element.utils'
import { ensureAngularComponentStylesContainStyleId } from './shared-styles-host-overwrites.utils'
import { ensureCreateOnecxDynamicContainer, ensureCreateOnecxElement } from './dynamic-content.utils'

export async function dynamicContentInitializer(configService: ConfigurationService) {
  const polyfillMode = await configService.getProperty(CONFIG_KEY.POLYFILL_SCOPE_MODE)
  ensureAngularComponentStylesContainStyleId()
  ensureBodyChangesIncludeStyleData(polyfillMode)
  ensureCreateOnecxElement()
  ensureCreateOnecxDynamicContainer()
  ensurePrimengDynamicDataIncludesIntermediateStyleData()
  ensureMaterialDynamicDataIncludesIntermediateStyleData()
  initializeOnecxTriggerElementListener()
}
