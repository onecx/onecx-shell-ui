jest.mock('@onecx/angular-webcomponents', () => ({
  bootstrapModule: jest.fn()
}))

jest.mock('@onecx/angular-integration-interface', () => {
  const actual = jest.requireActual('@onecx/angular-integration-interface')
  return {
    ...actual,
    Capability: {
      PARAMETERS_TOPIC: 'parameters',
      CURRENT_LOCATION_TOPIC: 'current-location',
      ACTIVENESS_AWARE_MENUS: 'activeness-aware-menus'
    },
    ShellCapabilityService: { setCapabilities: jest.fn() }
  }
})

jest.mock('./app/app.module', () => ({ AppModule: class AppModuleMock {} }))

import { bootstrapModule } from '@onecx/angular-webcomponents'
import { Capability, ShellCapabilityService } from '@onecx/angular-integration-interface'
import { AppModule } from './app/app.module'
import './bootstrap'

describe('shell bootstrap entry point', () => {
  it('sets shell capabilities and bootstraps the app module', () => {
    expect(ShellCapabilityService.setCapabilities).toHaveBeenCalledWith([
      Capability.PARAMETERS_TOPIC,
      Capability.CURRENT_LOCATION_TOPIC,
      Capability.ACTIVENESS_AWARE_MENUS
    ])
    expect(bootstrapModule).toHaveBeenCalledWith(AppModule, 'shell', false)
  })
})
