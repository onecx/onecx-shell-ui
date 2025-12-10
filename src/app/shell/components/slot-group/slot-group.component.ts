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
import { BehaviorSubject, debounceTime, filter, Subscription } from 'rxjs'
import { normalizeClassesToString } from '../../utils/normalize-classes.utils'

export type NgClassInputType = string | string[] | Set<string> | { [key: string]: any }

@Component({
  selector: 'ocx-shell-slot-group[name]',
  templateUrl: './slot-group.component.html',
  imports: [AngularRemoteComponentsModule, CommonModule],
  host: {
    '[attr.name]': 'name()',
    '[class]': '"flex justify-content-between " + computedSlotGroupClasses()',
    '[style]': 'slotGroupStyles()'
  },
  standalone: true
})
export class SlotGroupComponent implements OnInit, OnDestroy {
  name = input.required<string>()

  direction = input<'row' | 'row-reverse' | 'column' | 'column-reverse'>('row')

  slotStyles = input<{ [key: string]: any }>({})

  slotClasses = input<NgClassInputType>('')

  slotInputs = input<Record<string, unknown>>({})

  slotOutputs = input<Record<string, EventEmitter<any>>>({})

  slotGroupStyles = input<{ [key: string]: any }>({})

  slotGroupClasses = input<NgClassInputType>('')

  // Compute slot-group classes with direction
  computedSlotGroupClasses = computed(() => {
    const directionClasses = {
      row: 'flex-row w-full',
      'row-reverse': 'flex-row-reverse w-full',
      column: 'flex-column h-full',
      'column-reverse': 'flex-column-reverse h-full'
    }

    const baseClasses = directionClasses[this.direction()]
    const customClasses = normalizeClassesToString(this.slotGroupClasses())

    return `${baseClasses} ${customClasses}`.trim()
  })

  // Compute slot classes with direction
  computedSlotClasses = computed(() => {
    const directionClasses = {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      column: 'flex-column',
      'column-reverse': 'flex-column-reverse'
    }

    const baseClasses = directionClasses[this.direction()]
    const customClasses = normalizeClassesToString(this.slotClasses())

    return `${baseClasses} ${customClasses}`.trim()
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

  private readonly subscriptions: Subscription[] = []

  private resizeObserver: ResizeObserver | undefined
  private readonly componentSize$ = new BehaviorSubject<{ width: number; height: number }>({
    width: -1,
    height: -1
  })
  private readonly resizeDebounceTimeMs = 100

  private readonly resizedEventsPublisher = new ResizedEventsPublisher()
  private readonly resizedEventsTopic = new ResizedEventsTopic()
  private readonly requestedEventsChanged$ = this.resizedEventsTopic.pipe(
    filter((event): event is RequestedEventsChangedEvent => event.type === ResizedEventType.REQUESTED_EVENTS_CHANGED)
  )

  private readonly elementRef = inject(ElementRef)

  ngOnInit(): void {
    this.observeSlotSizeChanges()
  }

  ngOnDestroy(): void {
    this.resizedEventsTopic.destroy()
    this.subscriptions.forEach((sub) => sub.unsubscribe())
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

    const requestedEventsChangedSub = this.requestedEventsChanged$.subscribe((event) => {
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

    this.subscriptions.push(requestedEventsChangedSub)
  }
}
