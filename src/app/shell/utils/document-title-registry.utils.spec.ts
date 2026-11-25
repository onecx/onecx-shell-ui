import { DocumentTitleRegistry } from './document-title-registry.utils'

describe('DocumentTitleRegistry', () => {
  let registry: DocumentTitleRegistry
  beforeEach(() => (registry = new DocumentTitleRegistry()))

  it('given no entries, when resolving a location, then there is no title', () => {
    expect(registry.resolve('/admin/theme')).toBeUndefined()
  })

  it('given a pattern and an exact path, when resolving a location covered by both, then the exact title is used', () => {
    registry.apply({ path: '/admin/theme/search', title: 'Theme Search' })
    registry.apply({ path: '/admin/theme/**', title: 'Themes' })
    expect(registry.resolve('/admin/theme/search')).toBe('Theme Search')
  })

  it('given a registered path, when a newer title is published for it, then the newer title is used', () => {
    registry.apply({ path: '/admin/theme/**', title: 'Themes' })
    registry.apply({ path: '/admin/theme/**', title: 'Theme Management' })
    expect(registry.resolve('/admin/theme/42')).toBe('Theme Management')
  })

  it('given a registered path, when a message without title is published for it, then the entry is removed', () => {
    registry.apply({ path: '/admin/theme/**', title: 'Themes' })
    registry.apply({ path: '/admin/theme/**' })
    expect(registry.resolve('/admin/theme/42')).toBeUndefined()
  })

  it('given two matching paths, when the better one is removed with an empty title, then the other one is used', () => {
    registry.apply({ path: '/admin/**', title: 'Admin' })
    registry.apply({ path: '/admin/theme/**', title: 'Themes' })
    registry.apply({ path: '/admin/theme/**', title: '' })
    expect(registry.resolve('/admin/theme/42')).toBe('Admin')
  })

  it('given a registered path, when a removal for a different path string is published, then it is kept', () => {
    registry.apply({ path: '/admin/theme/**', title: 'Themes' })
    registry.apply({ path: '/admin/theme/42' })
    expect(registry.resolve('/admin/theme/42')).toBe('Themes')
  })
})
