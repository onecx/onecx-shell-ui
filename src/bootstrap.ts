import { bootstrapModule } from '@onecx/angular-webcomponents'
import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
import { Capability, ShellCapabilityService } from '@onecx/angular-integration-interface'

ShellCapabilityService.setCapabilities([Capability.CURRENT_LOCATION_TOPIC])
bootstrapModule(AppModule, 'shell', environment.production)
