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

// deprecated
import 'jest-preset-angular/setup-jest'

/*
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone/index.mjs'

setupZoneTestEnv(teo)
*/
