import { TestBed, waitForAsync } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'
import {
  ConfigurationServiceMock,
  provideAppStateServiceMock,
  provideConfigurationServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { CONFIG_KEY } from '@onecx/angular-integration-interface'

import { OneCXVersionInfoComponent } from './version-info.component'

fdescribe('OneCXVersionInfoComponent', () => {
  function setUp() {
    const fixture = TestBed.createComponent(OneCXVersionInfoComponent)
    const component = fixture.componentInstance
    TestBed.inject(ConfigurationService)
    component.configurationService.init()
    fixture.detectChanges()
    return { fixture, component }
  }

  type MFE = { displayName?: string | undefined; version?: string | undefined }
  const mfe: MFE = { displayName: 'OneCX Workspace UI', version: '1.0.0' }

  let baseUrlSubject: ReplaySubject<any>
  class MockAppStateService {
    currentWorkspace$ = { asObservable: () => of({ workspaceName: 'ADMIN' }) }
    currentMfe$ = { asObservable: () => of(mfe) }
  }
  let mockAppStateService: MockAppStateService

  let mockConfigurationService: ConfigurationServiceMock

  beforeEach(waitForAsync(() => {
    mockAppStateService = new MockAppStateService()

    baseUrlSubject = new ReplaySubject<any>(1)
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
        { provide: BASE_URL, useValue: baseUrlSubject }
      ]
    })
      .overrideComponent(OneCXVersionInfoComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule],
          providers: [{ provide: AppStateService, useValue: mockAppStateService }]
        }
      })
      .compileComponents()

    mockConfigurationService = TestBed.inject(ConfigurationServiceMock)
    mockConfigurationService.config$.publish({ [CONFIG_KEY.APP_VERSION]: 'v1' })

    baseUrlSubject.next('base_url_mock')
  }))

  describe('initialize', () => {
    it('should create', () => {
      const { component } = setUp()

      expect(component).toBeTruthy()
    })

    it('should call ocxInitRemoteComponent with the correct config', () => {
      const { component } = setUp()
      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }
      jest.spyOn(component, 'ocxInitRemoteComponent')

      component.ocxRemoteComponentConfig = mockConfig

      expect(component.ocxInitRemoteComponent).toHaveBeenCalledWith(mockConfig)
    })

    it('should init remote component', () => {
      mockConfigurationService.config$.publish({}) // empty config = no version

      const { component } = setUp()

      component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

      baseUrlSubject.asObservable().subscribe((item) => {
        expect(item).toEqual('base_url')
      })
    })

    it('should getting version info', (done) => {
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: ' - ',
          mfeInfo: 'OneCX Workspace UI 1.0.0'
        })
        done()
      })
    })

    it('should getting version info - without mfe version info', (done) => {
      const mfe: MFE = { displayName: 'OneCX Workspace UI' }
      mockAppStateService.currentMfe$ = { asObservable: () => of(mfe) }
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: ' - ',
          mfeInfo: 'OneCX Workspace UI'
        })
        done()
      })
    })

    it('should getting version info - without mfe display name', (done) => {
      const mfe: MFE = { version: '1.1.0' }
      mockAppStateService.currentMfe$ = { asObservable: () => of(mfe) }
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: ' - ',
          mfeInfo: ''
        })
        done()
      })
    })

    it('should getting version info - without mfe info', (done) => {
      const mfe: MFE = {}
      mockAppStateService.currentMfe$ = { asObservable: () => of(mfe) }
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: '',
          mfeInfo: ''
        })
        done()
      })
    })
  })
})
