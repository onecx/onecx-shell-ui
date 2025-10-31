import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed, waitForAsync } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, firstValueFrom } from 'rxjs'

import { CONFIG_KEY, ConfigurationService, MfeInfo } from '@onecx/angular-integration-interface'
import {
  AppStateServiceMock,
  ConfigurationServiceMock,
  provideAppStateServiceMock,
  provideConfigurationServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'

import { Workspace } from '@onecx/integration-interface'
import { ToastModule } from 'primeng/toast'
import { OneCXShellExtensionsComponent } from './shell-extensions.component'

function setUp() {
  const fixture = TestBed.createComponent(OneCXShellExtensionsComponent)
  const component = fixture.componentInstance
  TestBed.inject(ConfigurationService)
  fixture.detectChanges()
  return { fixture, component }
}

describe('OneCXShellExtensionsComponent', () => {
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultRCConfig = {
    productName: 'prodName',
    appId: 'appId',
    baseUrl: 'base',
    permissions: ['permission']
  }
  rcConfig.next(defaultRCConfig) // load default

  let mockConfigurationService: ConfigurationServiceMock
  let mockAppStateService: AppStateServiceMock

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('./../../../assets/i18n/de.json'),
          en: require('./../../../assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        provideConfigurationServiceMock(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    })
      .overrideComponent(OneCXShellExtensionsComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, ToastModule]
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
  })
})
