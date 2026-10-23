import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync, fakeAsync, flush as flushFakeAsync } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ReplaySubject, firstValueFrom } from 'rxjs'

import { ConfigurationService } from '@onecx/angular-integration-interface'
import { PortalMessageServiceMock, providePortalMessageServiceMock } from '@onecx/angular-integration-interface/mocks'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'

import { MessageService } from 'primeng/api'
import { ToastModule } from 'primeng/toast'
import { OneCXShellToastComponent } from './shell-toast.component'
import { provideTranslateTestingService } from '@onecx/angular-testing'

const fixtures: ComponentFixture<OneCXShellToastComponent>[] = []

function destroyFixtures() {
  for (const fixture of fixtures.splice(0)) {
    fixture.componentRef.injector.get(MessageService).clear()
    fixture.destroy()
  }
}

function setUp() {
  const fixture = TestBed.createComponent(OneCXShellToastComponent)
  fixtures.push(fixture)
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

  afterEach(() => destroyFixtures())

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
      flushFakeAsync()
    }))
  })

  describe('toast policy', () => {
    beforeEach(() => jest.useFakeTimers())

    afterEach(() => {
      destroyFixtures()
      jest.clearAllTimers()
      jest.useRealTimers()
    })

    function toastElements(fixture: { nativeElement: HTMLElement }) {
      return Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('.p-toast-message'))
    }

    function firstToast(fixture: { nativeElement: HTMLElement }): HTMLElement {
      const item = toastElements(fixture)[0]
      if (!item) throw new Error('toast not found')
      return item
    }

    function closeButton(item: HTMLElement): HTMLElement {
      const button = item.querySelector<HTMLElement>('button')
      if (!button) throw new Error('close button not found')
      return button
    }

    async function flush(fixture: ComponentFixture<OneCXShellToastComponent>, ms = 0) {
      jest.advanceTimersByTime(ms)
      await Promise.resolve()
      fixture.detectChanges()
    }

    it('keeps an error toast after 60 s until it is closed', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.error({ summaryKey: 'ERR', detailKey: 'D' })
      await flush(fixture, 1)
      expect(toastElements(fixture)).toHaveLength(1)

      await flush(fixture, 60000)
      expect(toastElements(fixture)).toHaveLength(1)
    })

    it('keeps an info toast for at least 10 s, pauses while a control inside has focus and closes once focus left', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.info({ summaryKey: 'INFO' })
      await flush(fixture, 1)
      const button = closeButton(firstToast(fixture))

      await flush(fixture, 5000)
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await flush(fixture, 60000)
      expect(toastElements(fixture)).toHaveLength(1)

      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await flush(fixture, 9000)
      expect(toastElements(fixture)).toHaveLength(1)

      await flush(fixture, 1001)
      await flush(fixture, 1000)
      expect(toastElements(fixture)).toHaveLength(0)
    })

    it('pauses an info toast while it is hovered', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.info({ summaryKey: 'INFO' })
      await flush(fixture, 1)
      const item = firstToast(fixture)

      item.dispatchEvent(new MouseEvent('mouseenter'))
      await flush(fixture, 60000)
      expect(toastElements(fixture)).toHaveLength(1)

      item.dispatchEvent(new MouseEvent('mouseleave'))
      await flush(fixture, 10001)
      await flush(fixture, 1000)
      expect(toastElements(fixture)).toHaveLength(0)
    })

    it('does not restart the timer when focus moves within the same toast', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.info({ summaryKey: 'INFO' })
      await flush(fixture, 1)
      const item = firstToast(fixture)
      const button = closeButton(item)
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      const dispatchSpy = jest.spyOn(item, 'dispatchEvent')

      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: item }))
      item.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: button }))
      expect(dispatchSpy).toHaveBeenCalledTimes(1) // only the focusin dispatched by this test
      dispatchSpy.mockRestore()

      await flush(fixture, 60000)
      expect(toastElements(fixture)).toHaveLength(1)
    })

    it('closes the focused toast on Escape', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.error({ summaryKey: 'ERR' })
      await flush(fixture, 1)
      const button = closeButton(firstToast(fixture))
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

      button.dispatchEvent(event)
      await flush(fixture, 1000)

      expect(event.defaultPrevented).toBe(true)
      expect(toastElements(fixture)).toHaveLength(0)
    })

    it('ignores Escape when the focus is outside any toast', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      portalMessageServiceMock.error({ summaryKey: 'ERR' })
      await flush(fixture, 1)
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

      fixture.nativeElement.dispatchEvent(event)
      await flush(fixture, 1000)

      expect(event.defaultPrevented).toBe(false)
      expect(toastElements(fixture)).toHaveLength(1)
    })

    it('ignores Escape in a toast without close button', async () => {
      const { fixture, messageService } = setUp()
      messageService.add({ severity: 'error', summary: 'ERR', sticky: true, closable: false })
      await flush(fixture, 1)
      const item = firstToast(fixture)
      expect(item.querySelector('button')).toBeNull()
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

      item.dispatchEvent(event)
      await flush(fixture, 1000)

      expect(event.defaultPrevented).toBe(false)
      expect(toastElements(fixture)).toHaveLength(1)
    })

    it('ignores events whose target is not an element', () => {
      const { component } = setUp()
      const focusEvent = new FocusEvent('focusin')
      const keyEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })

      expect(() => component.onFocusIn(focusEvent)).not.toThrow()
      expect(() => component.onFocusOut(focusEvent)).not.toThrow()
      component.onEscape(keyEvent)
      expect(keyEvent.defaultPrevented).toBe(false)
    })

    it('ignores toast items outside of the component', () => {
      const { component } = setUp()
      const foreignItem = document.createElement('div')
      foreignItem.className = 'p-toast-message'
      const foreignButton = document.createElement('button')
      foreignButton.className = 'p-toast-close-button'
      foreignItem.appendChild(foreignButton)
      document.body.appendChild(foreignItem)
      const dispatchSpy = jest.spyOn(foreignItem, 'dispatchEvent')
      const clickSpy = jest.spyOn(foreignButton, 'click')

      try {
        component.onFocusIn({ target: foreignButton, relatedTarget: null } as unknown as FocusEvent)
        component.onFocusOut({ target: foreignButton, relatedTarget: null } as unknown as FocusEvent)
        component.onEscape({ target: foreignButton, preventDefault: jest.fn() } as unknown as Event)

        expect(dispatchSpy).not.toHaveBeenCalled()
        expect(clickSpy).not.toHaveBeenCalled()
      } finally {
        foreignItem.remove()
      }
    })

    it('does not stack identical open toasts', async () => {
      const { fixture, portalMessageServiceMock } = setUp()
      for (let i = 0; i < 10; i++) {
        portalMessageServiceMock.error({ summaryKey: 'SAME', detailKey: 'SAME_D' })
      }
      await flush(fixture, 1)
      expect(toastElements(fixture)).toHaveLength(1)
    })
  })
})
