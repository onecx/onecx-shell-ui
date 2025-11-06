import { CommonModule } from '@angular/common'
import { Component, computed, ElementRef, EventEmitter, inject, input, OnDestroy, OnInit } from '@angular/core'
import { AngularRemoteComponentsModule } from '@onecx/angular-remote-components'
import { EventsPublisher, EventType, SlotGroupResizedEvent } from '@onecx/integration-interface'
import { debounceTime, Subject } from 'rxjs'

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

  slotStyleStart = input<{ [key: string]: any }>({})

  slotClassStart = input<SlotClassType>('')

  slotStyleCenter = input<{ [key: string]: any }>({})

  slotClassCenter = input<SlotClassType>('')

  slotStyleEnd = input<{ [key: string]: any }>({})

  slotClassEnd = input<SlotClassType>('')

  slotInputs = input<Record<string, unknown>>({})

  slotOutputs = input<Record<string, EventEmitter<any>>>({})

  groupStyles = input<{ [key: string]: any }>({})

  groupClasses = input<SlotClassType>('')

  containerStyles = computed(() => {
    return {
      'flex-direction': this.direction(),
      ...this.groupStyles()
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
  private readonly resizeSubject = new Subject<{ width: number; height: number }>()
  private readonly resizeDebounceTimeMs = 100

  private readonly eventsPublisher = inject(EventsPublisher)

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
