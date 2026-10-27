import { Component, computed, ElementRef, EventEmitter, inject, input, OnDestroy, OnInit } from '@angular/core'
import { toObservable, toSignal } from '@angular/core/rxjs-interop'
import { AngularRemoteComponentsModule, SLOT_SERVICE } from '@onecx/angular-remote-components'
import {
  ResizedEventsTopic,
  SlotGroupResizedEvent,
  RequestedEventsChangedEvent,
  ResizedEventType
} from '@onecx/integration-interface'
import { BehaviorSubject, debounceTime, filter, Subscription, switchMap } from 'rxjs'
import { normalizeClassesToString } from '../../utils/normalize-classes.utils'

export type NgClassInputType = string | string[] | Set<string> | { [key: string]: any }

@Component({
  selector: 'ocx-shell-slot-group[name]',
  templateUrl: './slot-group.component.html',
  imports: [AngularRemoteComponentsModule],
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

  // Equal-sized start/end slots keep the center slot centered even if one side is empty
  centerAligned = input<boolean>(false)

  private readonly slotService = inject(SLOT_SERVICE)

  private readonly centerSlotHasComponents = toSignal(
    toObservable(this.name).pipe(switchMap((name) => this.slotService.isSomeComponentDefinedForSlot(`${name}.center`))),
    { initialValue: false }
  )

  // Only when center is used, so a wide start (e.g. a legacy footer) is not squeezed for nothing
  applyCenterAlignment = computed(() => this.centerAligned() && this.centerSlotHasComponents())

  // Centered when stacked on small screens, start/center/end from md up
  slotAlignmentClasses = computed(() =>
    this.centerAligned()
      ? {
          start: 'justify-content-center md:justify-content-start',
          center: 'justify-content-center',
          end: 'justify-content-center md:justify-content-end'
        }
      : { start: '', center: '', end: '' }
  )

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

    // Stack slots on small screens so the sides are not squeezed next to the center
    const stackOnMobile = this.centerAligned() && this.direction() === 'row'
    const baseClasses = stackOnMobile ? 'flex-column md:flex-row w-full' : directionClasses[this.direction()]
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
      slotGroupName: this.name(),
      ...this.slotInputs()
    }
  })

  slotInputsCenter = computed(() => {
    return {
      slotGroupName: this.name(),
      ...this.slotInputs()
    }
  })

  slotInputsEnd = computed(() => {
    return {
      slotGroupName: this.name(),
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
      this.resizedEventsTopic.publish(slotGroupResizedEvent)
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
        this.resizedEventsTopic.publish(slotGroupResizedEvent)
      }
    })

    this.subscriptions.push(requestedEventsChangedSub)
  }
}
