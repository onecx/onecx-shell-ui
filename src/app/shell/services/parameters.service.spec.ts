import { TestBed } from '@angular/core/testing'
import { AppStateService, RemoteComponentsService } from '@onecx/angular-integration-interface'
import {
  AppStateServiceMock,
  FakeTopic,
  provideAppStateServiceMock,
  provideRemoteComponentsServiceMock,
  RemoteComponentsServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { ParametersTopicPayload, RemoteComponent, RemoteComponentsInfo, Workspace } from '@onecx/integration-interface'
import { firstValueFrom, of } from 'rxjs'
import { GetParametersResponse, Parameter, ParameterBffService } from 'src/app/shared/generated'
import { ParametersService } from './parameters.service'

describe('ParametersService', () => {
  let parametersService: ParametersService
  let appStateService: AppStateService
  let appStateServiceMock: AppStateServiceMock
  let remoteComponentsService: RemoteComponentsService
  let remoteComponentsServiceMock: RemoteComponentsServiceMock
  let parameterBffService: ParameterBffService
  let parametersPublisherMock: FakeTopic<ParametersTopicPayload>

  function publishWorkspace(workspace: Partial<Workspace>) {
    return appStateServiceMock.currentWorkspace$.publish({
      ...(appStateServiceMock.currentWorkspace$.getValue() as Workspace),
      ...workspace
    })
  }

  function publishRemoteComponents(remoteComponents: Partial<RemoteComponentsInfo>) {
    return remoteComponentsService.remoteComponents$.publish({ components: [], slots: [], ...remoteComponents })
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ParametersService,
        provideAppStateServiceMock(),
        provideRemoteComponentsServiceMock(),
        { provide: ParameterBffService, useValue: { getParameters: jest.fn() } }
      ]
    })
    parametersPublisherMock = new FakeTopic<ParametersTopicPayload>()
    parametersService = TestBed.inject(ParametersService)
    ;(parametersService as any).parametersPublisher = parametersPublisherMock

    appStateService = TestBed.inject(AppStateService)
    appStateServiceMock = TestBed.inject(AppStateServiceMock)
    remoteComponentsService = TestBed.inject(RemoteComponentsService)
    remoteComponentsServiceMock = TestBed.inject(RemoteComponentsServiceMock)
    parameterBffService = TestBed.inject(ParameterBffService)
  })

  it('should be created', () => {
    expect(parametersService).toBeTruthy()
  })

  it('should not call service if there are no apps in workspace', async () => {
    const cache = { parameters: [] }
    const parameters: GetParametersResponse = { products: {} }

    Storage.prototype.getItem = jest.fn().mockReturnValue(JSON.stringify(cache))
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({ routes: [] })
    await publishRemoteComponents({ components: [] })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(parameters) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(parameterBffService.getParameters).not.toHaveBeenCalled()
    expect(publishedParameters).toEqual(cache)
  })

  it('should call service with all uncached apps in workspace', async () => {
    const cache = {
      parameters: [
        {
          appId: 'cachedAppId1',
          productName: 'product1',
          parameters: { key1: 'value1' },
          expirationDate: new Date().getTime() + 3600 * 1000
        },
        {
          appId: 'cachedAppId2',
          productName: 'product2',
          parameters: { key2: 'value2' },
          expirationDate: new Date().getTime()
        },
        {
          appId: 'cachedAppId3',
          productName: 'product2',
          parameters: { key3: 'value3' },
          expirationDate: new Date().getTime() + 3600 * 1000
        }
      ]
    }
    const bffResponse: GetParametersResponse = {
      products: {
        product1: {
          uncachedAppId2: [{ name: 'key4', value: 'value2' } as Parameter, { name: 'key5', value: true } as Parameter],
          uncachedAppId1: [{ name: 'key6', value: 42 } as Parameter]
        },
        product2: {
          uncachedAppId6: [],
          cachedAppId2: []
        }
      }
    }

    Storage.prototype.getItem = jest.fn().mockReturnValue(JSON.stringify(cache))
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({
      routes: [
        { appId: 'uncachedAppId1', productName: 'product1' },
        { appId: 'uncachedAppId2', productName: 'product1' },
        { appId: 'cachedAppId1', productName: 'product1' },
        { appId: 'uncachedAppId3', productName: 'product2' }
      ]
    })
    await publishRemoteComponents({
      components: [
        { appId: 'uncachedAppId4', productName: 'product1' } as RemoteComponent,
        { appId: 'uncachedAppId5', productName: 'product1' } as RemoteComponent,
        { appId: 'cachedAppId2', productName: 'product2' } as RemoteComponent,
        { appId: 'uncachedAppId6', productName: 'product2' } as RemoteComponent,
        { appId: 'uncachedAppId3', productName: 'product2' } as RemoteComponent //already in workspace
      ]
    })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(bffResponse) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(parameterBffService.getParameters).toHaveBeenCalledWith({
      products: {
        product1: ['uncachedAppId1', 'uncachedAppId2', 'uncachedAppId4', 'uncachedAppId5'],
        product2: ['uncachedAppId3', 'cachedAppId2', 'uncachedAppId6']
      }
    })

    expect(publishedParameters.parameters.length).toEqual(6)

    // In cache and was up-to-date -> we have not asked for an update -> unchanged
    expect(publishedParameters.parameters[0].productName).toEqual(cache.parameters[0].productName)
    expect(publishedParameters.parameters[0].appId).toEqual(cache.parameters[0].appId)
    expect(publishedParameters.parameters[0].parameters).toEqual(cache.parameters[0].parameters)
    expect((publishedParameters.parameters[0] as any)['expirationDate']).toEqual(cache.parameters[0].expirationDate)

    // In cache but outdated -> asked for an update and got it from BFF
    expect(publishedParameters.parameters[1].productName).toEqual(cache.parameters[1].productName)
    expect(publishedParameters.parameters[1].appId).toEqual(cache.parameters[1].appId)
    expect(publishedParameters.parameters[1].parameters).toEqual({})
    expect((publishedParameters.parameters[1] as any)['expirationDate']).not.toEqual(cache.parameters[1].expirationDate)

    // In cache but app not in workspace -> no change
    expect(publishedParameters.parameters[2].productName).toEqual(cache.parameters[2].productName)
    expect(publishedParameters.parameters[2].appId).toEqual(cache.parameters[2].appId)
    expect(publishedParameters.parameters[2].parameters).toEqual(cache.parameters[2].parameters)
    expect((publishedParameters.parameters[2] as any)['expirationDate']).toEqual(cache.parameters[2].expirationDate)

    // Apps that have not been in the cache and have been newly requested and added
    expect(publishedParameters.parameters[3].productName).toEqual('product1')
    expect(publishedParameters.parameters[3].appId).toEqual('uncachedAppId2')
    expect(publishedParameters.parameters[3].parameters).toEqual({
      key4: 'value2',
      key5: true
    })
    expect((publishedParameters.parameters[3] as any)['expirationDate']).toBeDefined()

    expect(publishedParameters.parameters[4].productName).toEqual('product1')
    expect(publishedParameters.parameters[4].appId).toEqual('uncachedAppId1')
    expect(publishedParameters.parameters[4].parameters).toEqual({
      key6: 42
    })
    expect((publishedParameters.parameters[4] as any)['expirationDate']).toBeDefined()

    expect(publishedParameters.parameters[5].productName).toEqual('product2')
    expect(publishedParameters.parameters[5].appId).toEqual('uncachedAppId6')
    expect(publishedParameters.parameters[5].parameters).toEqual({})
    expect((publishedParameters.parameters[5] as any)['expirationDate']).toBeDefined()
  })

  it('should not fail if cache is corrupted', async () => {
    const parameters: GetParametersResponse = { products: {} }

    Storage.prototype.getItem = jest.fn().mockReturnValue('invalid json [')
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({ routes: [] })
    await publishRemoteComponents({ components: [] })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(parameters) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(parameterBffService.getParameters).not.toHaveBeenCalled()
    expect(publishedParameters).toEqual({ parameters: [] })
  })

  it('should not fail if cache structure is wrong', async () => {
    const parameters: GetParametersResponse = { products: {} }

    Storage.prototype.getItem = jest.fn().mockReturnValue('{ "parameters2": "invalid" }')
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({ routes: [] })
    await publishRemoteComponents({ components: [] })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(parameters) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(parameterBffService.getParameters).not.toHaveBeenCalled()
    expect(publishedParameters.parameters).toEqual([])
  })

  it('should not fail if cache is not yet there', async () => {
    const parameters: GetParametersResponse = { products: {} }

    Storage.prototype.getItem = jest.fn().mockReturnValue(undefined)
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({ routes: [] })
    await publishRemoteComponents({ components: [] })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(parameters) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(parameterBffService.getParameters).not.toHaveBeenCalled()
    expect(publishedParameters.parameters).toEqual([])
  })

  it('should not fail with invalid route or remoteComponent config', async () => {
    const cache = { parameters: [] }
    const parameters: GetParametersResponse = { products: {} }

    Storage.prototype.getItem = jest.fn().mockReturnValue(JSON.stringify(cache))
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({ routes: undefined })
    await publishRemoteComponents({ components: undefined })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(parameters) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(parameterBffService.getParameters).not.toHaveBeenCalled()
    expect(publishedParameters).toEqual(cache)
  })

  it('should not fail with corrupted route config', async () => {
    const cache = { parameters: [] }
    const parameters: GetParametersResponse = { products: {} }

    Storage.prototype.getItem = jest.fn().mockReturnValue(JSON.stringify(cache))
    Storage.prototype.setItem = jest.fn()

    await publishWorkspace({ routes: [{}] })
    await publishRemoteComponents({ components: [] })
    jest.spyOn(parameterBffService, 'getParameters').mockReturnValue(of(parameters) as any)

    parametersService.initialize()

    const publishedParameters = await firstValueFrom(parametersPublisherMock.asObservable())

    expect(publishedParameters).toEqual(cache)
  })
})
