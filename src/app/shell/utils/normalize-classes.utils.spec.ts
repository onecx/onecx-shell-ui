import { normalizeClassesToString } from './normalize-classes.utils'

describe('normalizeClassesToString utility', () => {
  it('should return empty string for falsy values', () => {
    expect(normalizeClassesToString(undefined as any)).toBe('')
    expect(normalizeClassesToString(null as any)).toBe('')
    expect(normalizeClassesToString('' as any)).toBe('')
  })

  it('should handle array input', () => {
    expect(normalizeClassesToString(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle Set input', () => {
    expect(normalizeClassesToString(new Set(['foo', 'bar']))).toBe('foo bar')
  })

  it('should handle object input with truthy values', () => {
    expect(normalizeClassesToString({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should handle object input with all falsy values', () => {
    expect(normalizeClassesToString({ foo: false, bar: 0, baz: null })).toBe('')
  })

  it('should trim a string input', () => {
    expect(normalizeClassesToString('  foo   bar  ')).toBe('foo   bar')
  })
})
