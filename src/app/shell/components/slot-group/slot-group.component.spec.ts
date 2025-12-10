import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { SlotGroupComponent } from './slot-group.component'
import { ComponentRef, ElementRef, EventEmitter } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { SlotServiceMock } from '@onecx/angular-remote-components/mocks'
import { SlotGroupHarness } from './slot-group.harness'
import { By } from '@angular/platform-browser'
import { SLOT_SERVICE, SlotComponent, SlotService } from '@onecx/angular-remote-components'

class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
  trigger(width: number, height: number) {
    const entry = {
      contentRect: { width, height } as DOMRectReadOnly,
      target: {} as Element,
      borderBoxSize: [] as any,
      contentBoxSize: [] as any,
      devicePixelContentBoxSize: [] as any
    } as ResizeObserverEntry
    this.callback([entry], this as unknown as ResizeObserver)
  }
}
globalThis.ResizeObserver = ResizeObserverMock

class ResizedEventsPublisherMock {
  publish = jest.fn()
}

jest.mock('@onecx/integration-interface', () => {
  const actual = jest.requireActual('@onecx/integration-interface')
  const fakeTopic = jest.requireActual('@onecx/accelerator').FakeTopic
  class ResizedEventsPublisherMock {
    publish = jest.fn()
  }

  return {
    ...actual,
    ResizedEventsTopic: fakeTopic,
    ResizedEventsPublisher: ResizedEventsPublisherMock
  }
})

import {
  ResizedEventType,
  SlotGroupResizedEvent,
  Technologies,
  TopicResizedEventType
} from '@onecx/integration-interface'
import { FakeTopic } from '@onecx/accelerator'

function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => a.localeCompare(b))
}

describe('SlotGroupComponent', () => {
  let component: SlotGroupComponent
  let fixture: ComponentFixture<SlotGroupComponent>
  let componentRef: ComponentRef<SlotGroupComponent>
  let slotGroupHarness: SlotGroupHarness
  let slotServiceMock: SlotServiceMock

  let resizeEventsPublisher: ResizedEventsPublisherMock
  let resizeObserverMock: ResizeObserverMock
  let resizedEventsTopic: FakeTopic<TopicResizedEventType>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlotGroupComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SlotService,
          useClass: SlotServiceMock
        }
      ]
    }).compileComponents()
  })

  beforeEach(async () => {
    fixture = TestBed.createComponent(SlotGroupComponent)
    component = fixture.componentInstance
    componentRef = fixture.componentRef
    componentRef.setInput('name', 'test-slot')
    resizeEventsPublisher = component['resizedEventsPublisher'] as any as ResizedEventsPublisherMock
    fixture.detectChanges()

    resizeObserverMock = (component as any).resizeObserver as ResizeObserverMock
    slotServiceMock = TestBed.inject(SLOT_SERVICE) as unknown as SlotServiceMock
    resizedEventsTopic = component['resizedEventsTopic'] as any as FakeTopic<TopicResizedEventType>

    const testComponentConfig = {
      componentType: Promise.resolve(class TestComp {}),
      remoteComponent: {
        appId: 'test-app',
        productName: 'test-product',
        baseUrl: 'http://localhost',
        technology: Technologies.Angular
      },
      permissions: Promise.resolve(['test-permission'])
    }

    slotServiceMock.assignComponentToSlot(testComponentConfig, 'test-slot.start')
    slotServiceMock.assignComponentToSlot(testComponentConfig, 'test-slot.center')
    slotServiceMock.assignComponentToSlot(testComponentConfig, 'test-slot.end')

    slotGroupHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlotGroupHarness)
  })

  afterEach(() => {
    slotServiceMock.clearAssignments()
  })

  it('should observe the native element on init', () => {
    expect(resizeObserverMock.observe).toHaveBeenCalledTimes(1)

    const elRef = (component as any).elementRef as ElementRef<HTMLElement>

    expect(resizeObserverMock.observe).toHaveBeenCalledWith(elRef.nativeElement)
  })

  it('should debounce resize events and publish SLOT_GROUP_RESIZED once', fakeAsync(() => {
    resizeEventsPublisher.publish.mockClear()

    // Simulate multiple rapid size changes
    resizeObserverMock.trigger(100, 50)
    resizeObserverMock.trigger(120, 60)
    resizeObserverMock.trigger(140, 70)

    // Nothing yet because of debounce (100ms in component)
    expect(resizeEventsPublisher.publish).not.toHaveBeenCalled()

    // Advance time by slightly more than debounce
    tick(110)

    expect(resizeEventsPublisher.publish).toHaveBeenCalledTimes(1)

    const arg = resizeEventsPublisher.publish.mock.calls[0][0] as SlotGroupResizedEvent

    expect(arg.type).toBe(ResizedEventType.SLOT_GROUP_RESIZED)
    expect(arg.payload.slotGroupName).toBe('test-slot')
    expect(arg.payload.slotGroupDetails).toEqual({ width: 140, height: 70 })
  }))

  it('should publish SLOT_GROUP_RESIZED when requestedEventsChanged$ emits for this slot group', fakeAsync(() => {
    // Simulate initial size
    resizeObserverMock.trigger(200, 100)

    tick(110) // Wait for debounce

    resizeEventsPublisher.publish.mockClear()

    resizedEventsTopic.publish({
      type: ResizedEventType.REQUESTED_EVENTS_CHANGED,
      payload: {
        type: ResizedEventType.SLOT_GROUP_RESIZED,
        name: 'test-slot'
      }
    })

    expect(resizeEventsPublisher.publish).toHaveBeenCalledWith({
      type: ResizedEventType.SLOT_GROUP_RESIZED,
      payload: {
        slotGroupName: 'test-slot',
        slotGroupDetails: { width: 200, height: 100 }
      }
    })
  }))

  it('should disconnect ResizeObserver and complete subject on destroy', () => {
    const disconnectSpy = jest.spyOn(resizeObserverMock, 'disconnect')

    fixture.destroy()

    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('does not throw if resizeObserver is undefined on destroy (covers optional chain false branch)', () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(component as any).resizeObserver = undefined
    expect(() => fixture.destroy()).not.toThrow()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should have created 3 slots', async () => {
    const slots = await slotGroupHarness.getAllSlots()

    expect(slots).toHaveLength(3)
  })

  describe('Input Signals', () => {
    describe('name input signal', () => {
      it('should get name of the slot group component with name', async () => {
        const slotGroupName = await slotGroupHarness.getName()

        expect(slotGroupName).toBe('test-slot')
      })

      it('should pass name to child slots with correct suffixes', async () => {
        componentRef.setInput('name', 'new-test-slot')

        const startSlot = await slotGroupHarness.getStartSlot()
        const centerSlot = await slotGroupHarness.getCenterSlot()
        const endSlot = await slotGroupHarness.getEndSlot()

        expect(await startSlot?.getName()).toBe('new-test-slot.start')
        expect(await centerSlot?.getName()).toBe('new-test-slot.center')
        expect(await endSlot?.getName()).toBe('new-test-slot.end')
      })
    })

    describe('direction input signal', () => {
      it('should have default direction value as row', () => {
        expect(component.direction()).toBe('row')
      })
    })

    describe('slotInputs input signal', () => {
      it('should have default empty object for slotInputs', () => {
        expect(component.slotInputs()).toEqual({})
      })

      it('should pass computed inputs to respective child slots', async () => {
        const inputs = { data: 'test' }
        componentRef.setInput('slotInputs', inputs)

        const slots = await slotGroupHarness.getAllSlots()

        // Use By.directive to get SlotComponent instances
        const slotDebugElements = fixture.debugElement.queryAll(By.directive(SlotComponent))

        expect(slotDebugElements).toHaveLength(slots.length)

        for (let index = 0; index < slots.length; index++) {
          const slotComponentInstance = slotDebugElements[index].componentInstance as SlotComponent
          expect(slotComponentInstance.inputs).toEqual(inputs)
        }
      })
    })

    describe('slotOutputs input signal', () => {
      it('should have default empty object for slotOutputs', () => {
        expect(component.slotOutputs()).toEqual({})
      })

      it('should pass slotOutputs to all child slots', async () => {
        const outputs = {
          event: new EventEmitter<void>()
        }

        componentRef.setInput('slotOutputs', outputs)

        const slots = await slotGroupHarness.getAllSlots()

        // Use By.directive to get SlotComponent instances
        const slotDebugElements = fixture.debugElement.queryAll(By.directive(SlotComponent))

        expect(slotDebugElements).toHaveLength(slots.length)

        for (let index = 0; index < slots.length; index++) {
          const slotComponentInstance = slotDebugElements[index].componentInstance as SlotComponent

          expect(slotComponentInstance.outputs).toEqual(outputs)
        }
      })
    })

    describe('slotGroupStyles input signal', () => {
      it('should have default empty object for slotGroupStyles', () => {
        expect(component.slotGroupStyles()).toEqual({})
      })

      it('should update slotGroupStyles signal value', () => {
        const styles = { backgroundColor: 'green', padding: '10px' }
        componentRef.setInput('slotGroupStyles', styles)

        expect(component.slotGroupStyles()).toEqual(styles)
      })

      it('should apply slotGroupStyles of type object to container div', async () => {
        const slotGroupStylesObject = { color: 'blue', padding: '15px' }
        const expectedStyles = { color: 'blue', padding: '15px' }

        componentRef.setInput('slotGroupStyles', slotGroupStylesObject)

        const containerSlotStyles = await slotGroupHarness.getContainerStyles(['color', 'padding'])

        expect(containerSlotStyles).toEqual(expectedStyles)
      })
    })

    describe('slotStyles input signal', () => {
      it('should have default empty object for slotStyles', () => {
        expect(component.slotStyles()).toEqual({})
      })

      it('should update slotStyles signal value', () => {
        const styles = { color: 'red', 'font-size': '14px' }
        componentRef.setInput('slotStyles', styles)

        expect(component.slotStyles()).toEqual(styles)
      })
    })

    describe('slotClasses input signal', () => {
      it('should have default empty string for slotClasses', () => {
        expect(component.slotClasses()).toBe('')
      })

      it('should update slotClasses signal value', () => {
        const classes = 'custom-class another-class'
        componentRef.setInput('slotClasses', classes)

        expect(component.slotClasses()).toBe(classes)
      })
    })

    describe('slotGroupClasses input signal', () => {
      it('should have default empty string for slotGroupClasses', () => {
        expect(component.slotGroupClasses()).toBe('')
      })

      it('should apply slotGroupClasses of type string to the slot-group host element', async () => {
        const slotGroupClassesString = 'test-group-class another-class'
        const expectedClasses = [
          'flex',
          'justify-content-between',
          'flex-row',
          'w-full',
          'test-group-class',
          'another-class'
        ]

        componentRef.setInput('slotGroupClasses', slotGroupClassesString)
        fixture.detectChanges()

        const containerSlotClasses = await slotGroupHarness.getContainerGroupClasses()
        expect(sortClasses(containerSlotClasses)).toEqual(sortClasses(expectedClasses))
      })

      it('should apply slotGroupClasses of type string array to the slot-group host element', async () => {
        const slotGroupClassesArray = ['test-group-class', 'another-class']
        const expectedClasses = [
          'flex',
          'justify-content-between',
          'flex-row',
          'w-full',
          'test-group-class',
          'another-class'
        ]

        componentRef.setInput('slotGroupClasses', slotGroupClassesArray)
        fixture.detectChanges()

        const containerSlotClasses = await slotGroupHarness.getContainerGroupClasses()
        expect(sortClasses(containerSlotClasses)).toEqual(sortClasses(expectedClasses))
      })

      it('should apply slotGroupClasses of type Set to the slot-group host element', async () => {
        const slotGroupClassesSet = new Set(['test-group-class', 'another-class'])
        const expectedClasses = [
          'flex',
          'justify-content-between',
          'flex-row',
          'w-full',
          'test-group-class',
          'another-class'
        ]

        componentRef.setInput('slotGroupClasses', slotGroupClassesSet)
        fixture.detectChanges()

        const containerSlotClasses = await slotGroupHarness.getContainerGroupClasses()
        expect(sortClasses(containerSlotClasses)).toEqual(sortClasses(expectedClasses))
      })

      it('should apply slotGroupClasses of type object to the slot-group host element', async () => {
        const slotGroupClassesObject = { 'test-group-class': true, 'another-class': false, 'third-class': true }
        const expectedClasses = [
          'flex',
          'justify-content-between',
          'flex-row',
          'w-full',
          'test-group-class',
          'third-class'
        ]

        componentRef.setInput('slotGroupClasses', slotGroupClassesObject)
        fixture.detectChanges()

        const containerSlotClasses = await slotGroupHarness.getContainerGroupClasses()
        expect(sortClasses(containerSlotClasses)).toEqual(sortClasses(expectedClasses))
      })
    })

    describe('computedSlotGroupClasses computed signal', () => {
      it('should compute computedSlotGroupClasses with default direction', () => {
        const computedSlotGroupClasses = component.computedSlotGroupClasses()

        expect(computedSlotGroupClasses).toBe('flex-row w-full')
      })

      it('should update classes when direction changes to column', () => {
        componentRef.setInput('direction', 'column')

        const computedSlotGroupClasses = component.computedSlotGroupClasses()

        expect(computedSlotGroupClasses).toBe('flex-column h-full')
      })

      it('should apply correct classes for row-reverse direction', () => {
        componentRef.setInput('direction', 'row-reverse')

        const computedSlotGroupClasses = component.computedSlotGroupClasses()

        expect(computedSlotGroupClasses).toBe('flex-row-reverse w-full')
      })

      it('should apply correct classes for column-reverse direction', () => {
        componentRef.setInput('direction', 'column-reverse')

        const computedSlotGroupClasses = component.computedSlotGroupClasses()

        expect(computedSlotGroupClasses).toBe('flex-column-reverse h-full')
      })

      it('should merge custom slotGroupClasses with base classes', () => {
        componentRef.setInput('slotGroupClasses', 'custom-class another-class')

        const computedSlotGroupClasses = component.computedSlotGroupClasses()

        expect(computedSlotGroupClasses).toBe('flex-row w-full custom-class another-class')
      })
    })

    describe('computedSlotClasses computed signal', () => {
      it('should compute slot classes with default direction', () => {
        const slotClasses = component.computedSlotClasses()

        expect(slotClasses).toBe('flex-row')
      })

      it('should update classes when direction changes to column', () => {
        componentRef.setInput('direction', 'column')

        const slotClasses = component.computedSlotClasses()

        expect(slotClasses).toBe('flex-column')
      })

      it('should merge custom slotClasses with base classes', () => {
        componentRef.setInput('slotClasses', 'custom-slot-class')

        const slotClasses = component.computedSlotClasses()

        expect(slotClasses).toBe('flex-row custom-slot-class')
      })
    })

    //   describe('slotStyles and slotClasses with multiple components in a slot', () => {
    //     it('should apply slotStyles and slotClasses to every start slot div when multiple components are assigned to start slot', async () => {
    //       slotServiceMock.assignComponentToSlot(
    //         {
    //           componentType: Promise.resolve(undefined),
    //           remoteComponent: {
    //             appId: 'test-app-2',
    //             productName: 'test-product-2',
    //             baseUrl: 'http://localhost',
    //             technology: Technologies.WebComponentModule,
    //             elementName: 'test-component-2'
    //           },
    //           permissions: Promise.resolve(['test-permission-2'])
    //         },
    //         'test-slot.start'
    //       )

    //       const styles = { padding: '10px', color: 'blue' }
    //       const expectedStyles = { padding: '10px', color: 'blue' }

    //       const classes = 'multi-class another-class'
    //       const expectedClasses = ['multi-class', 'another-class']

    //       componentRef.setInput('rcWrapperStyles', styles)
    //       componentRef.setInput('rcWrapperClasses', classes)

    //       const startSlotDivs = await slotGroupHarness.getStartSlotDivContainers()

    //       expect(startSlotDivs?.length).toBe(2)

    //       const startSlotStyles = await slotGroupHarness.getStartSlotStyles(['padding', 'color'])

    //       for (let index = 0; index < startSlotDivs.length; index++) {
    //         expect(startSlotStyles[index]).toEqual(expectedStyles)
    //       }

    //       const startSlotClasses = await slotGroupHarness.getStartSlotClasses()

    //       for (let index = 0; index < startSlotDivs.length; index++) {
    //         expect(startSlotClasses[index]).toEqual(expectedClasses)
    //       }
    //     })

    //     it('should apply slotStyles and slotClasses to every center slot div when multiple components are assigned to center slot', async () => {
    //       slotServiceMock.assignComponentToSlot('test-component-2', 'test-slot.center')

    //       const styles = { padding: '10px', color: 'blue' }
    //       const expectedStyles = { padding: '10px', color: 'blue' }

    //       const classes = 'multi-class another-class'
    //       const expectedClasses = ['multi-class', 'another-class']

    //       componentRef.setInput('rcWrapperStyles', styles)
    //       componentRef.setInput('rcWrapperClasses', classes)

    //       const centerSlotDivs = await slotGroupHarness.getCenterSlotDivContainers()

    //       expect(centerSlotDivs.length).toBe(2)

    //       const centerSlotStyles = await slotGroupHarness.getCenterSlotStyles(['padding', 'color'])

    //       for (let index = 0; index < centerSlotDivs.length; index++) {
    //         expect(centerSlotStyles[index]).toEqual(expectedStyles)
    //       }

    //       const centerSlotClasses = await slotGroupHarness.getCenterSlotClasses()

    //       for (let index = 0; index < centerSlotDivs.length; index++) {
    //         expect(centerSlotClasses[index]).toEqual(expectedClasses)
    //       }
    //     })

    //     it('should apply slotStyles and slotClasses to every end slot div when multiple components are assigned to end slot', async () => {
    //       slotServiceMock.assignComponentToSlot('test-component-2', 'test-slot.end')

    //       const styles = { padding: '10px', color: 'blue' }
    //       const expectedStyles = { padding: '10px', color: 'blue' }

    //       const classes = 'multi-class another-class'
    //       const expectedClasses = ['multi-class', 'another-class']

    //       componentRef.setInput('rcWrapperStyles', styles)
    //       componentRef.setInput('rcWrapperClasses', classes)

    //       const endSlotDivs = await slotGroupHarness.getEndSlotDivContainers()

    //       expect(endSlotDivs.length).toBe(2)

    //       const endSlotStyles = await slotGroupHarness.getEndSlotStyles(['padding', 'color'])

    //       for (let index = 0; index < endSlotDivs.length; index++) {
    //         expect(endSlotStyles[index]).toEqual(expectedStyles)
    //       }

    //       const endSlotClasses = await slotGroupHarness.getEndSlotClasses()

    //       for (let index = 0; index < endSlotDivs.length; index++) {
    //         expect(endSlotClasses[index]).toEqual(expectedClasses)
    //       }
    //     })

    //     it('should apply slotStyles and slotClasses to every slot div in all slots when multiple components are assigned to all slots', async () => {
    //       slotServiceMock.assignComponentToSlot('test-component-2', 'test-slot.start')
    //       slotServiceMock.assignComponentToSlot('test-component-2', 'test-slot.center')
    //       slotServiceMock.assignComponentToSlot('test-component-2', 'test-slot.end')

    //       const styles = { padding: '10px', color: 'blue' }
    //       const expectedStyles = { padding: '10px', color: 'blue' }

    //       const classes = 'multi-class another-class'
    //       const expectedClasses = ['multi-class', 'another-class']

    //       componentRef.setInput('rcWrapperStyles', styles)
    //       componentRef.setInput('rcWrapperClasses', classes)

    //       const allSlotDivs = await slotGroupHarness.getAllSlotDivContainers()
    //       const allSlots = await slotGroupHarness.getAllSlots()

    //       expect(allSlotDivs.length).toBe(6)

    //       for (const slot of allSlots) {
    //         const slotStyles = await slot.getAllSlotStylesForProperties(['padding', 'color'])

    //         for (const slotStyle of slotStyles) {
    //           expect(slotStyle).toEqual(expectedStyles)
    //         }

    //         const slotClasses = await slot.getAllSlotClasses()
    //         for (const slotClass of slotClasses) {
    //           expect(slotClass).toEqual(expectedClasses)
    //         }
    //       }
    //     })
    //   })
  })
})
