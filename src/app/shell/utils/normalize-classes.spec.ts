import { normalizeClassesToString } from './normalize-classes.utils'

describe('normalizeClassesToString utility', () => {
  it('should return empty string for falsy values', () => {
    expect(normalizeClassesToString('')).toBe('')
    expect(normalizeClassesToString(null as any)).toBe('')
    expect(normalizeClassesToString(undefined as any)).toBe('')
  })

  it('should handle array input', () => {
    expect(normalizeClassesToString(['class1', 'class2'])).toBe('class1 class2')
    expect(normalizeClassesToString([])).toBe('')
  })

  it('should handle Set input', () => {
    expect(normalizeClassesToString(new Set(['class1', 'class2']))).toBe('class1 class2')
    expect(normalizeClassesToString(new Set())).toBe('')
  })

  it('should handle object input with truthy values', () => {
    expect(normalizeClassesToString({ class1: true, class2: false, class3: true })).toBe('class1 class3')
  })

  it('should handle object input with all falsy values', () => {
    expect(normalizeClassesToString({ class1: false, class2: false })).toBe('')
  })

  it('should handle empty object input', () => {
    expect(normalizeClassesToString({})).toBe('')
  })

  it('should handle string input', () => {
    expect(normalizeClassesToString('class1 class2')).toBe('class1 class2')
    expect(normalizeClassesToString('  trimmed  ')).toBe('trimmed')
  })
})
