import { BaseHarnessFilters, ContentContainerComponentHarness, HarnessPredicate } from '@angular/cdk/testing'
import { SlotHarness } from '@onecx/angular-remote-components/testing'

export interface SlotGroupHarnessFilters extends BaseHarnessFilters {
  name?: string
}

/**
 * Harness for interacting with an OCX slot group component in tests.
 *
 * Provides methods to inspect the container and individual slots (start, center, end)
 * within a slot group, including their styles, classes, and content.
 */
export class SlotGroupHarness extends ContentContainerComponentHarness {
  static readonly hostSelector = 'ocx-slot-group'

  static with(options: SlotGroupHarnessFilters = {}): HarnessPredicate<SlotGroupHarness> {
    return new HarnessPredicate(SlotGroupHarness, options).addOption('name', options.name, (harness, name) =>
      HarnessPredicate.stringMatches(harness.getName(), name)
    )
  }

  /**
   * Gets the name of the slot from either the 'name' attribute or 'ng-reflect-name' attribute.
   * Checks both for robust detection during different Angular compilation modes.
   * @returns Promise that resolves to the slot name or null if not found.
   */
  async getName(): Promise<string | null> {
    const host = await this.host()

    const nameAttr = await host.getAttribute('name')
    if (nameAttr !== null) {
      return nameAttr
    }

    const reflectName = await host.getAttribute('ng-reflect-name')
    if (reflectName !== null) {
      return reflectName
    }

    return null
  }

  /**
   * Gets specific CSS property values from the slot group's host element.
   * @param properties Array of CSS property names to retrieve.
   * @returns Promise that resolves to an object mapping property names to their CSS values.
   */
  async getContainerStyles(properties: string[]): Promise<Record<string, string>> {
    const host = await this.host()
    const result: Record<string, string> = {}

    for (const property of properties) {
      result[property] = await host.getCssValue(property)
    }
    return result
  }

  /**
   * Gets the CSS classes from the slot group's host element.
   * @returns Promise that resolves to an array of CSS class names.
   */
  async getContainerGroupClasses(): Promise<string[]> {
    const host = await this.host()
    const classAttr = await host.getAttribute('class')
    console.log('Container class attribute:', classAttr)
    return classAttr ? classAttr.split(' ') : []
  }

  /**
   * Gets all slot harnesses within the slot group.
   * @returns Promise that resolves to an array of all slot harnesses.
   */
  async getAllSlots(): Promise<SlotHarness[]> {
    return await this.locatorForAll(SlotHarness)()
  }

  /**
   * Gets the start slot harness (slot with name ending in '.start').
   * @returns Promise that resolves to the start slot harness or null if not found.
   */
  async getStartSlot(): Promise<SlotHarness | null> {
    const slots = await this.getAllSlots()
    for (const slot of slots) {
      const name = await slot.getName()
      if (name?.endsWith('.start')) {
        return slot
      }
    }
    return null
  }

  /**
   * Gets the center slot harness (slot with name ending in '.center').
   * @returns Promise that resolves to the center slot harness or null if not found.
   */
  async getCenterSlot(): Promise<SlotHarness | null> {
    const slots = await this.getAllSlots()
    for (const slot of slots) {
      const name = await slot.getName()
      if (name?.endsWith('.center')) {
        return slot
      }
    }
    return null
  }

  /**
   * Gets the end slot harness (slot with name ending in '.end').
   * @returns Promise that resolves to the end slot harness or null if not found.
   */
  async getEndSlot(): Promise<SlotHarness | null> {
    const slots = await this.getAllSlots()
    for (const slot of slots) {
      const name = await slot.getName()
      if (name?.endsWith('.end')) {
        return slot
      }
    }
    return null
  }
}
