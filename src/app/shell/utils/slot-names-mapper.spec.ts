import { LoadWorkspaceConfigResponse } from 'src/app/shared/generated'
import { mapSlots, slotNamesMapping } from './slot-names-mapper'

const mockWorkspaceConfig: LoadWorkspaceConfigResponse = {
  routes: [],
  theme: { name: '', properties: '' },
  workspace: { name: '', baseUrl: '' },
  components: [],
  slots: []
}

describe('mapSlots', () => {
  it('should map old slot names to new slot-group slot names', () => {
    const oldSlotName = Object.keys(slotNamesMapping)[0]
    const newSlotName = slotNamesMapping[oldSlotName]
    const config = { ...mockWorkspaceConfig, slots: [{ name: oldSlotName, components: [] }] }
    const mappedConfig = mapSlots(config)

    expect(mappedConfig.slots[0].name).toBe(newSlotName)
  })

  it('should not map slot names that are not in the mapping', () => {
    const config = { ...mockWorkspaceConfig, slots: [{ name: 'other-slot', components: [] }] }
    const mappedConfig = mapSlots(config)

    expect(mappedConfig.slots[0].name).toBe('other-slot')
  })

  it('should map multiple slots', () => {
    const config = {
      ...mockWorkspaceConfig,
      slots: [
        { name: 'onecx-shell-vertical-menu', components: [] },
        { name: 'onecx-shell-header-left', components: [] },
        { name: 'other-slot', components: [] }
      ]
    }
    const mappedConfig = mapSlots(config)

    expect(mappedConfig.slots[0].name).toBe(slotNamesMapping['onecx-shell-vertical-menu'])
    expect(mappedConfig.slots[1].name).toBe(slotNamesMapping['onecx-shell-header-left'])
    expect(mappedConfig.slots[2].name).toBe('other-slot')
  })

  it('should return config with empty slots if slots is empty', () => {
    const config = { ...mockWorkspaceConfig, slots: [] }
    const mappedConfig = mapSlots(config)

    expect(mappedConfig.slots).toEqual([])
  })

  it('should merge slots with the same mapped name and combine their components', () => {
    const config = {
      ...mockWorkspaceConfig,
      slots: [
        { name: 'onecx-shell-footer', components: ['A'] },
        { name: 'onecx-page-footer', components: ['B'] }
      ]
    }
    const mappedConfig = mapSlots(config)

    expect(mappedConfig.slots.length).toBe(1)
    expect(mappedConfig.slots[0].name).toBe(slotNamesMapping['onecx-shell-footer'])
    expect(mappedConfig.slots[0].components).toEqual(expect.arrayContaining(['A', 'B']))
  })

  it('should remove duplicate components when merging slots', () => {
    const config = {
      ...mockWorkspaceConfig,
      slots: [
        { name: 'onecx-shell-footer', components: ['A', 'B'] },
        { name: 'onecx-page-footer', components: ['B', 'C'] }
      ]
    }
    const mappedConfig = mapSlots(config)

    expect(mappedConfig.slots.length).toBe(1)
    expect(mappedConfig.slots[0].components).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    expect(mappedConfig.slots[0].components.filter((c) => c === 'B').length).toBe(1)
  })
})
