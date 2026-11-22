import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'

import {
  AppStateServiceMock,
  provideAppStateServiceMock,
  provideRemoteComponentsServiceMock,
  RemoteComponentsServiceMock
} from '@onecx/angular-integration-interface/mocks'

import { GetParametersResponse, ParameterBffService } from 'src/app/shared/generated'
import { ParametersService } from './parameters.service'

const MINUTE = 60 * 1000

function createExpiryService() {
  const store = new Map<string, string>()
  Storage.prototype.getItem = jest.fn().mockImplementation((key: string) => store.get(key) ?? null)
  Storage.prototype.setItem = jest.fn().mockImplementation((key: string, value: string) => {
    store.set(key, value)
  })

  const bffResponse: GetParametersResponse = { products: { product1: { appId1: [] } } }
  const getParametersSpy = jest.fn().mockReturnValue(of(bffResponse))

  TestBed.configureTestingModule({
    providers: [
      ParametersService,
      provideAppStateServiceMock(),
      provideRemoteComponentsServiceMock(),
      { provide: ParameterBffService, useValue: { getParameters: getParametersSpy } }
    ]
  })

  return {
    startTime: Date.now(),
    parametersService: TestBed.inject(ParametersService),
    appStateServiceMock: TestBed.inject(AppStateServiceMock),
    remoteComponentsServiceMock: TestBed.inject(RemoteComponentsServiceMock),
    getParametersSpy
  }
}

type ExpiryService = ReturnType<typeof createExpiryService>

async function seedAndRequestAfter(service: ExpiryService, minutes: number): Promise<void> {
  const { appStateServiceMock, remoteComponentsServiceMock, parametersService, startTime } = service
  await appStateServiceMock.currentWorkspace$.publish({
    ...appStateServiceMock.currentWorkspace$.getValue(),
    routes: [{ appId: 'appId1', productName: 'product1' }]
  })
  await remoteComponentsServiceMock.remoteComponents$.publish({ components: [], slots: [] })
  parametersService.initialize()
  await jest.advanceTimersByTimeAsync(0)
  jest.setSystemTime(new Date(startTime + minutes * MINUTE))
  parametersService.initialize()
  await jest.advanceTimersByTimeAsync(0)
}

describe('ParametersService cache expiry', () => {
  let service: ExpiryService

  beforeEach(() => {
    jest.useFakeTimers()
    service = createExpiryService()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('given parameters are cached when the same parameters are requested 59 minutes later then the cached value is served', async () => {
    await seedAndRequestAfter(service, 59)

    expect(service.getParametersSpy).toHaveBeenCalledTimes(1)
  })

  it('given parameters are cached when the same parameters are requested 61 minutes later then the parameters are refetched', async () => {
    await seedAndRequestAfter(service, 61)

    expect(service.getParametersSpy).toHaveBeenCalledTimes(2)
    expect(service.getParametersSpy).toHaveBeenLastCalledWith({ products: { product1: ['appId1'] } })
  })
})
