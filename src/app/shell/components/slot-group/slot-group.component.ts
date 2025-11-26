import { CommonModule } from '@angular/common'
import { Component, computed, ElementRef, EventEmitter, inject, input, OnDestroy, OnInit } from '@angular/core'
import { AngularRemoteComponentsModule } from '@onecx/angular-remote-components'
import { EventsPublisher, EventType, SlotGroupResizedEvent } from '@onecx/integration-interface'
import { debounceTime, Subject } from 'rxjs'
import { normalizeClassesToString } from '../../utils/normalize-classes.utils'

export type NgClassInputType = string | string[] | Set<string> | { [key: string]: any }

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

  slotClasses = input<NgClassInputType>('')

  slotInputs = input<Record<string, unknown>>({})

  slotOutputs = input<Record<string, EventEmitter<any>>>({})

  slotGroupStyles = input<{ [key: string]: any }>({})

  slotGroupClasses = input<NgClassInputType>('')

  rcWrapperStyles = input<{ [key: string]: any }>({})

  rcWrapperClasses = input<NgClassInputType>('')

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

  private resizeObserver: ResizeObserver | undefined
  private readonly resizeSubject = new Subject<{ width: number; height: number }>()
  private readonly resizeDebounceTimeMs = 100

  private readonly eventsPublisher = new EventsPublisher()

  private readonly elementRef = inject(ElementRef)

  ngOnInit(): void {
    this.observeSlotSizeChanges()
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
    this.resizeSubject.complete()
  }

  private observeSlotSizeChanges() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const width = entry.contentRect.width
        const height = entry.contentRect.height
        this.resizeSubject.next({ width, height })
      }
    })

    this.resizeSubject.pipe(debounceTime(this.resizeDebounceTimeMs)).subscribe(({ width, height }) => {
      const slotGroupResizedEvent: SlotGroupResizedEvent = {
        type: EventType.SLOT_GROUP_RESIZED,
        payload: {
          slotName: this.name(),
          slotDetails: { width, height }
        }
      }
      this.eventsPublisher.publish(slotGroupResizedEvent)
    })

    this.resizeObserver.observe(this.elementRef.nativeElement)
  }
}
