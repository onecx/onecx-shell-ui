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
