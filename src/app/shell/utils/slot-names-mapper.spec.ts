import { mapSlots, slotNamesMapping } from './slot-names-mapper'

describe('mapSlots', () => {
  it('should map old slot names to new slot-group slot names', () => {
    const oldSlotName = Object.keys(slotNamesMapping)[0]
    const newSlotName = slotNamesMapping[oldSlotName]
    const slots = [{ name: oldSlotName, components: [] }]
    const mappedSlots = mapSlots(slots)

    expect(mappedSlots[0].name).toBe(newSlotName)
  })

  it('should not map slot names that are not in the mapping', () => {
    const slots = [{ name: 'other-slot', components: [] }]
    const mappedSlots = mapSlots(slots)

    expect(mappedSlots[0].name).toBe('other-slot')
  })

  it('should map multiple slots', () => {
    const slots = [
      { name: 'onecx-shell-vertical-menu', components: [] },
      { name: 'onecx-shell-header-left', components: [] },
      { name: 'other-slot', components: [] }
    ]
    const mappedSlots = mapSlots(slots)

    expect(mappedSlots[0].name).toBe(slotNamesMapping['onecx-shell-vertical-menu'])
    expect(mappedSlots[1].name).toBe(slotNamesMapping['onecx-shell-header-left'])
    expect(mappedSlots[2].name).toBe('other-slot')
  })

  it('should return empty array if slots is empty', () => {
    const slots = [] as { name: string; components: string[] }[]
    const mappedSlots = mapSlots(slots)

    expect(mappedSlots).toEqual([])
  })

  it('should merge slots with the same mapped name and combine their components', () => {
    const slots = [
      { name: 'onecx-shell-footer', components: ['A'] },
      { name: 'onecx-page-footer', components: ['B'] }
    ]
    const mappedSlots = mapSlots(slots)

    expect(mappedSlots.length).toBe(1)
    expect(mappedSlots[0].name).toBe(slotNamesMapping['onecx-shell-footer'])
    expect(mappedSlots[0].components).toEqual(expect.arrayContaining(['A', 'B']))
  })

  it('should remove duplicate components when merging slots', () => {
    const slots = [
      { name: 'onecx-shell-footer', components: ['A', 'B'] },
      { name: 'onecx-page-footer', components: ['B', 'C'] }
    ]
    const mappedSlots = mapSlots(slots)

    expect(mappedSlots.length).toBe(1)
    expect(mappedSlots[0].components).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    expect(mappedSlots[0].components.filter((c) => c === 'B').length).toBe(1)
  })
})
