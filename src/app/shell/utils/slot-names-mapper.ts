import { Slot } from '@onecx/integration-interface'

export const slotNamesMapping: Record<string, string> = {
  'onecx-shell-vertical-menu': 'onecx-shell-body-start-start',
  'onecx-shell-horizontal-menu': 'onecx-shell-header-center',
  'onecx-shell-header-left': 'onecx-shell-header-start',
  'onecx-shell-header-right': 'onecx-shell-header-end',
  'onecx-shell-sub-header': 'onecx-shell-body-header-center',
  'onecx-shell-footer': 'onecx-shell-body-footer-start',
  'onecx-page-footer': 'onecx-shell-body-footer-start'
}

/**
 * Maps slot names in the given slots array using slotNamesMapping.
 * @param slots Array of Slot objects to map.
 * @returns Array of Slot objects with mapped names.
 */
function mapSlotNames(slots: Slot[]): Slot[] {
  return slots.map((slot: Slot) => ({
    ...slot,
    name: slotNamesMapping[slot.name] ?? slot.name
  }))
}

/**
 * Merges slots with the same name, combining their components and removing duplicates.
 * @param slots Array of Slot objects (with mapped names).
 * @returns Array of merged Slot objects.
 */
function mergeSlotsByName(slots: Slot[]): Slot[] {
  const slotMap: Record<string, Slot> = {}
  for (const slot of slots) {
    if (slotMap[slot.name]) {
      const existingSlot = slotMap[slot.name]
      slotMap[slot.name] = {
        ...existingSlot,
        components: [...existingSlot.components, ...slot.components.filter((c) => !existingSlot.components.includes(c))]
      }
    } else {
      slotMap[slot.name] = { ...slot, components: [...slot.components] }
    }
  }
  return Object.values(slotMap)
}

/**
 * Normalizes slot names to the slot group naming convention.
 * - Slot names listed in slotNamesMapping are replaced with their mapped values.
 * - All other slot names remain unchanged.
 * - After mapping, slots with the same name are merged, combining their components and removing duplicates.
 *
 * @param slots Array of Slot objects to normalize.
 * @returns Normalized and merged slots.
 */
export function mapSlots(slots: Slot[]): Slot[] {
  const mappedSlots = mapSlotNames(slots)
  const mergedSlots = mergeSlotsByName(mappedSlots)

  return mergedSlots
}
