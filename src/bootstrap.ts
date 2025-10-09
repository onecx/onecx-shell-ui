import { bootstrapModule } from '@onecx/angular-webcomponents'
import { Capability, ShellCapabilityService } from '@onecx/angular-integration-interface'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'

ShellCapabilityService.setCapabilities([
  Capability.PARAMETERS_TOPIC,
  Capability.CURRENT_LOCATION_TOPIC,
  Capability.ACTIVENESS_AWARE_MENUS
])
bootstrapModule(AppModule, 'shell', environment.production)
