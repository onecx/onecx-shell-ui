const teo = {
  teardown: {
    destroyAfterEach: false,
    rethrowErrors: true
  },
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true
}

// @ts-expect-error https://thymikee.github.io/jest-preset-angular/docs/getting-started/test-environment
globalThis.ngJest = {
  testEnvironmentOptions: teo
}
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone'
setupZoneTestEnv()

// Ensure Module Federation runtime global exists in unit tests.
// In browser builds this is injected by the federation runtime.
Object.defineProperty(globalThis, '__FEDERATION__', {
  value: {
    __INSTANCES__: [
      {
        name: 'onecx_shell_ui',
        shareScopeMap: {}
      }
    ]
  },
  writable: true,
  configurable: true
})
