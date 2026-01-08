import { TestBed, waitForAsync } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ReplaySubject, firstValueFrom } from 'rxjs'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { ConfigurationService, MfeInfo } from '@onecx/angular-integration-interface'
import {
  AppStateServiceMock,
  ConfigurationServiceMock,
  provideAppStateServiceMock,
  provideConfigurationServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { CONFIG_KEY } from '@onecx/angular-integration-interface'

import { OneCXVersionInfoComponent, Version } from './version-info.component'
import { Workspace } from '@onecx/integration-interface'
import { provideTranslateTestingService } from '@onecx/angular-testing'

describe('OneCXVersionInfoComponent', () => {
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultRCConfig = {
    productName: 'prodName',
    appId: 'appId',
    baseUrl: 'base',
    permissions: ['permission']
  }
  rcConfig.next(defaultRCConfig) // load default

  function setUp() {
    const fixture = TestBed.createComponent(OneCXVersionInfoComponent)
    const component = fixture.componentInstance
    TestBed.inject(ConfigurationService)
    component.config.init()
    fixture.detectChanges()
    return { fixture, component }
  }

  let mockConfigurationService: ConfigurationServiceMock
  let mockAppStateService: AppStateServiceMock

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        provideConfigurationServiceMock(),
        provideTranslateTestingService({}),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    })
      .overrideComponent(OneCXVersionInfoComponent, {
        set: {
          imports: [CommonModule]
        }
      })
      .compileComponents()

    // Set initial values
    mockConfigurationService = TestBed.inject(ConfigurationServiceMock)
    mockConfigurationService.config$.publish({ [CONFIG_KEY.APP_VERSION]: 'v1' })

    mockAppStateService = TestBed.inject(AppStateServiceMock)
    mockAppStateService.currentMfe$.publish({ displayName: 'OneCX Workspace UI', version: '1.0.0' } as MfeInfo)
    mockAppStateService.currentWorkspace$.publish({ workspaceName: 'ADMIN' } as Workspace)
  }))

  describe('initialize', () => {
    it('should create', () => {
      const { component } = setUp()

      expect(component).toBeTruthy()
    })

    it('should call ocxInitRemoteComponent with the correct config', async () => {
      const { component } = setUp()
      const mockConfig: RemoteComponentConfig = {
        productName: 'prodName',
        appId: 'appId',
        baseUrl: 'base',
        permissions: ['permission']
      }
      component.ocxRemoteComponentConfig = mockConfig

      const rcConfigValue = await firstValueFrom(rcConfig)

      expect(rcConfigValue).toEqual(mockConfig)
    })

    it('should getting version info', async () => {
      mockAppStateService.currentMfe$.publish({ displayName: 'OneCX Workspace UI', version: 'v1.0.0' } as MfeInfo)
      mockAppStateService.currentWorkspace$.publish({ workspaceName: 'ADMIN' } as Workspace)
      const { component } = setUp()
      const mockVersion: Version = {
        workspaceName: 'ADMIN',
        shellInfo: 'v1',
        mfeInfo: 'OneCX Workspace UI v1.0.0',
        separator: ' - '
      }

      const versionInfo = await firstValueFrom(component.versionInfo$)

      expect(versionInfo).toEqual(mockVersion)
    })

    it('should getting version info - no workspace version', async () => {
      const mfe = { displayName: 'OneCX Workspace UI' } as MfeInfo
      mockAppStateService.currentMfe$.publish(mfe)
      const w = { workspaceName: 'ADMIN' } as Workspace
      mockAppStateService.currentWorkspace$.publish({ workspaceName: 'ADMIN' } as Workspace)
      const mockVersion: Version = {
        workspaceName: w.workspaceName,
        shellInfo: 'v1',
        mfeInfo: mfe.displayName, // no version
        separator: ' - '
      }

      const { component } = setUp()

      const versionInfo = await firstValueFrom(component.versionInfo$)
      expect(versionInfo).toEqual(mockVersion)
    })

    it('should getting version info - no workspace version', async () => {
      const mfe = {} as MfeInfo
      mockAppStateService.currentMfe$.publish(mfe)
      const w = { workspaceName: 'ADMIN' } as Workspace
      mockAppStateService.currentWorkspace$.publish({ workspaceName: 'ADMIN' } as Workspace)
      const mockVersion: Version = {
        workspaceName: w.workspaceName,
        shellInfo: 'v1',
        mfeInfo: '', // empty
        separator: ''
      }

      const { component } = setUp()

      const versionInfo = await firstValueFrom(component.versionInfo$)
      expect(versionInfo).toEqual(mockVersion)
    })
  })
})
