import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync, fakeAsync } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ReplaySubject, firstValueFrom } from 'rxjs'

import { ConfigurationService } from '@onecx/angular-integration-interface'
import { PortalMessageServiceMock, providePortalMessageServiceMock } from '@onecx/angular-integration-interface/mocks'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'

import { MessageService } from 'primeng/api'
import { ToastModule } from 'primeng/toast'
import { OneCXShellToastComponent } from './shell-toast.component'
import { provideTranslateTestingService } from '@onecx/angular-testing'

function setUp() {
  const fixture = TestBed.createComponent(OneCXShellToastComponent)
  const component = fixture.componentInstance

  // Get services from component's injector (not TestBed) because overrideComponent provides separate instances
  const messageService = fixture.componentRef.injector.get(MessageService)
  const portalMessageServiceMock = fixture.componentRef.injector.get(PortalMessageServiceMock)

  const messageServiceSpy = jest.spyOn(messageService, 'add')

  TestBed.inject(ConfigurationService)
  fixture.detectChanges()

  return { fixture, component, messageService, portalMessageServiceMock, messageServiceSpy }
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig },
        MessageService,
        provideTranslateTestingService({})
      ]
    })
      .overrideComponent(OneCXShellToastComponent, {
        set: {
          imports: [ToastModule],
          providers: [
            providePortalMessageServiceMock(),
            { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) },
            MessageService
          ]
        }
      })
      .compileComponents()
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

    it('should subscribe to portalMessageService.message$ and call messageService.add in constructor', fakeAsync(() => {
      const { portalMessageServiceMock, messageServiceSpy } = setUp()

      portalMessageServiceMock.success({
        summaryKey: 'TEST_SUCCESS_MESSAGE_KEY'
      })

      expect(messageServiceSpy).toHaveBeenCalledTimes(1)
      expect(messageServiceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summaryKey: 'TEST_SUCCESS_MESSAGE_KEY'
        })
      )
    }))
  })

  describe('toast policy', () => {
    afterEach(() => jest.useRealTimers())

    function toastElements(fixture: { nativeElement: HTMLElement }) {
      return Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('.p-toast-message'))
    }

    async function flush(fixture: ComponentFixture<OneCXShellToastComponent>, ms = 0) {
      jest.advanceTimersByTime(ms)
      await Promise.resolve()
      fixture.detectChanges()
    }

    it('keeps an error toast after 60 s until it is closed', async () => {
      jest.useFakeTimers()
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.error({ summaryKey: 'ERR', detailKey: 'D' })
      await flush(fixture, 1)
      expect(toastElements(fixture).length).toBe(1)

      await flush(fixture, 60000)
      expect(toastElements(fixture).length).toBe(1)
    })

    it('keeps an info toast for at least 10 s and pauses while a control inside has focus', async () => {
      jest.useFakeTimers()
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.info({ summaryKey: 'INFO' })
      await flush(fixture, 1)
      const item = toastElements(fixture)[0]
      const button = item.querySelector<HTMLElement>('button')!

      await flush(fixture, 5000)
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await flush(fixture, 60000)
      expect(toastElements(fixture).length).toBe(1)

      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await flush(fixture, 9000)
      expect(toastElements(fixture).length).toBe(1)
    })

    it('closes the focused toast on Escape', async () => {
      jest.useFakeTimers()
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.error({ summaryKey: 'ERR' })
      await flush(fixture, 1)
      const button = toastElements(fixture)[0].querySelector<HTMLElement>('button')!
      const closeSpy = jest.spyOn(button, 'click')

      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

      expect(closeSpy).toHaveBeenCalled()
    })

    it('does not stack identical open toasts', async () => {
      jest.useFakeTimers()
      const { fixture, portalMessageServiceMock } = setUp()
      for (let i = 0; i < 10; i++) {
        portalMessageServiceMock.error({ summaryKey: 'SAME', detailKey: 'SAME_D' })
      }
      await flush(fixture, 1)
      expect(toastElements(fixture).length).toBe(1)
    })
  })
})
