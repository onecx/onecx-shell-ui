import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { DOCUMENT } from '@angular/common'

import { VisibleKeyboardFocusDirective } from './visible-keyboard-focus.directive'
import { CONFIG_KEY, ConfigurationService, ParametersService } from '@onecx/angular-integration-interface'
import { ConfigurationServiceMock } from '@onecx/angular-integration-interface/mocks'

@Component({
  standalone: true,
  imports: [VisibleKeyboardFocusDirective],
  template: `
    <div ocxShellVisibleKeyboardFocus>
      <button id="btn">Button</button>

      <div class="p-multiselect" id="ms">
        <span class="p-multiselect-label-container">
          <span class="p-multiselect-label" id="ms-label"> Selected items </span>
        </span>

        <span class="p-multiselect-trigger">
          <span class="pi pi-chevron-down"></span>
        </span>

        <!-- focusable inner element -->
        <input id="ms-input" />
      </div>
    </div>
  `
})
class TestHostComponent {}

const parametersServiceMock = {
  get: jest.fn().mockResolvedValue(undefined)
}

describe('VisibleKeyboardFocusDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let document: Document

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: ConfigurationService, useClass: ConfigurationServiceMock },
        { provide: ParametersService, useValue: parametersServiceMock }
      ]
    }).compileComponents()

    const cfg = TestBed.inject(ConfigurationService)
    jest.spyOn(cfg, 'getConfig').mockResolvedValue({
      [CONFIG_KEY.ONECX_KEYBOARD_FOCUSABLE_SELECTOR]: ['.p-multiselect']
    } as any)

    fixture = TestBed.createComponent(TestHostComponent)
    document = TestBed.inject(DOCUMENT)
    fixture.detectChanges()
    await fixture.whenStable()
  })

  const pressTab = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))

  const pointerDown = () => document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))

  const dispatchFocusIn = (target: HTMLElement) => {
    const ev = new FocusEvent('focusin', { bubbles: true })
    Object.defineProperty(ev, 'target', { value: target, enumerable: true })
    document.dispatchEvent(ev)
  }

  const dispatchFocusOut = (relatedTarget?: HTMLElement) => {
    const ev = new FocusEvent('focusout', { bubbles: true })
    if (relatedTarget) {
      Object.defineProperty(ev, 'relatedTarget', {
        value: relatedTarget,
        enumerable: true
      })
    }
    document.dispatchEvent(ev)
  }

  it('should add focus class on native element when using keyboard', () => {
    const button = fixture.debugElement.query(By.css('#btn')).nativeElement as HTMLElement

    pressTab()
    button.focus()
    dispatchFocusIn(button)

    expect(button.classList.contains('ocx-focus-host')).toBe(true)
  })

  it('should not add focus class on native element when using mouse', () => {
    const button = fixture.debugElement.query(By.css('#btn')).nativeElement as HTMLElement

    pointerDown()
    button.focus()
    dispatchFocusIn(button)

    expect(button.classList.contains('ocx-focus-host')).toBe(false)
  })

  it('should apply focus class to p-multiselect when inner element gets keyboard focus', () => {
    const multiselect = fixture.debugElement.query(By.css('#ms')).nativeElement as HTMLElement

    const input = fixture.debugElement.query(By.css('#ms-input')).nativeElement as HTMLElement

    pressTab()
    input.focus()
    dispatchFocusIn(input)

    expect(multiselect.classList.contains('ocx-focus-host')).toBe(true)
  })
  it('should clear focus class when focus leaves p-multiselect', () => {
    const multiselect = fixture.debugElement.query(By.css('#ms')).nativeElement as HTMLElement

    const input = fixture.debugElement.query(By.css('#ms-input')).nativeElement as HTMLElement

    pressTab()
    input.focus()
    dispatchFocusIn(input)

    expect(multiselect.classList.contains('ocx-focus-host')).toBe(true)

    dispatchFocusOut()

    expect(multiselect.classList.contains('ocx-focus-host')).toBe(false)
  })

  it('should ignore focus on document body when using keyboard', () => {
    pressTab()
    dispatchFocusIn(document.body as unknown as HTMLElement)

    const button = fixture.debugElement.query(By.css('#btn')).nativeElement as HTMLElement
    expect(button.classList.contains('ocx-focus-host')).toBe(false)
  })

  it('should fall back to default selectors when parametersService.get throws', async () => {
    parametersServiceMock.get.mockImplementation(() => {
      throw new Error('boom')
    })

    const fixture2 = TestBed.createComponent(TestHostComponent)
    fixture2.detectChanges()
    await fixture2.whenStable()

    const ms = fixture2.debugElement.query(By.css('#ms')).nativeElement as HTMLElement
    const input = fixture2.debugElement.query(By.css('#ms-input')).nativeElement as HTMLElement

    pressTab()
    input.focus()
    const ev = new FocusEvent('focusin', { bubbles: true })
    Object.defineProperty(ev, 'target', { value: input, enumerable: true })
    TestBed.inject(DOCUMENT).dispatchEvent(ev)

    expect(ms.classList.contains('ocx-focus-host')).toBe(true)
  })
})
