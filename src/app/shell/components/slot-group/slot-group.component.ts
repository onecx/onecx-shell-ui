import { CommonModule } from '@angular/common'
import { Component, computed, ElementRef, EventEmitter, inject, input, OnDestroy, OnInit } from '@angular/core'
import { AngularRemoteComponentsModule } from '@onecx/angular-remote-components'
import {
  ResizedEventsPublisher,
  SlotGroupResizedEvent,
  ResizedEventsTopic,
  RequestedEventsChangedEvent,
  ResizedEventType
} from '@onecx/integration-interface'
import { BehaviorSubject, debounceTime, filter } from 'rxjs'

type SlotClassType = string | string[] | Set<string> | { [key: string]: any }

@Component({
  selector: 'ocx-shell-slot-group[name]',
  templateUrl: './slot-group.component.html',
  imports: [AngularRemoteComponentsModule, CommonModule],
  host: {
    '[attr.name]': 'name()'
  },
  standalone: true
})
export class SlotGroupComponent implements OnInit, OnDestroy {
  name = input.required<string>()

  direction = input<'row' | 'row-reverse' | 'column' | 'column-reverse'>('row')

  slotStyles = input<{ [key: string]: any }>({})

  slotClasses = input<SlotClassType>('')

  slotInputs = input<Record<string, unknown>>({})

  slotOutputs = input<Record<string, EventEmitter<any>>>({})

  groupStyles = input<{ [key: string]: any }>({})

  groupClasses = input<SlotClassType>('')

  rcWrapperStyles = input<{ [key: string]: any }>({})

  rcWrapperClasses = input<SlotClassType>('')

  // slot-group container styles
  containerStyles = computed(() => {
    const direction = this.direction()
    const defaultStyles: { [key: string]: any } = {
      'flex-direction': direction
    }

    if (direction === 'row' || direction === 'row-reverse') {
      defaultStyles['width'] = '100%'
    } else if (direction === 'column' || direction === 'column-reverse') {
      defaultStyles['height'] = '100%'
    }

    return {
      ...defaultStyles,
      ...this.groupStyles()
    }
  })

  // slot styles applied to each slot inside the slot-group
  computedSlotStyles = computed(() => {
    return {
      display: 'flex',
      'flex-direction': this.direction(),
      'align-items': 'center',
      ...this.slotStyles()
    }
  })

  // we need to control one input of the slots individually later
  slotInputsStart = computed(() => {
    return {
      ...this.slotInputs()
    }
  })

  slotInputsCenter = computed(() => {
    return {
      ...this.slotInputs()
    }
  })

  slotInputsEnd = computed(() => {
    return {
      ...this.slotInputs()
    }
  })

  private resizeObserver: ResizeObserver | undefined
  private readonly componentSize$ = new BehaviorSubject<{ width: number; height: number }>({
    width: 0,
    height: 0
  })
  private readonly resizeDebounceTimeMs = 100

  private resizedEventsPublisher = new ResizedEventsPublisher()
  private resizedEventsTopic = new ResizedEventsTopic()
  private requestedEventsChanged$ = this.resizedEventsTopic.pipe(
    filter((event): event is RequestedEventsChangedEvent => event.type === ResizedEventType.REQUESTED_EVENTS_CHANGED)
  )

  private readonly elementRef = inject(ElementRef)

  ngOnInit(): void {
    this.observeSlotSizeChanges()
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
    this.componentSize$.complete()
  }

  private observeSlotSizeChanges() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const width = entry.contentRect.width
        const height = entry.contentRect.height
        this.componentSize$.next({ width, height })
      }
    })

    this.componentSize$.pipe(debounceTime(this.resizeDebounceTimeMs)).subscribe(({ width, height }) => {
      const slotGroupResizedEvent: SlotGroupResizedEvent = {
        type: ResizedEventType.SLOT_GROUP_RESIZED,
        payload: {
          slotGroupName: this.name(),
          slotGroupDetails: { width, height }
        }
      }
      this.resizedEventsPublisher.publish(slotGroupResizedEvent)
    })

    this.resizeObserver.observe(this.elementRef.nativeElement)

    this.requestedEventsChanged$.subscribe((event) => {
      if (event.payload.type === ResizedEventType.SLOT_GROUP_RESIZED && event.payload.name === this.name()) {
        const { width, height } = this.componentSize$.getValue()
        const slotGroupResizedEvent: SlotGroupResizedEvent = {
          type: ResizedEventType.SLOT_GROUP_RESIZED,
          payload: {
            slotGroupName: this.name(),
            slotGroupDetails: { width, height }
          }
        }
        this.resizedEventsPublisher.publish(slotGroupResizedEvent)
      }
    })
  }
}
