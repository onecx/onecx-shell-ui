import { comparePathPrecedence, matchesPath, RankedPath } from './document-title-path.utils'

describe('matchesPath', () => {
  it('given an exact path, when the location is the same path, then it matches', () => {
    expect(matchesPath('/admin/theme/search', '/admin/theme/search')).toBe(true)
  })

  it('given an exact path, when the location differs, then it does not match', () => {
    expect(matchesPath('/admin/theme/search', '/admin/theme/detail')).toBe(false)
  })

  it('given a "*" segment, when the location has exactly one segment in its place, then it matches', () => {
    expect(matchesPath('/admin/theme/*/edit', '/admin/theme/42/edit')).toBe(true)
  })

  it('given a "*" segment, when the location has no segment in its place, then it does not match', () => {
    expect(matchesPath('/admin/theme/*', '/admin/theme')).toBe(false)
  })

  it('given a "*" segment, when the location has more segments, then it does not match', () => {
    expect(matchesPath('/admin/theme/*', '/admin/theme/42/edit')).toBe(false)
  })

  it('given a trailing "**", when the location is the base path, then it matches', () => {
    expect(matchesPath('/admin/theme/**', '/admin/theme')).toBe(true)
  })

  it('given a trailing "**", when the location has more segments, then it matches', () => {
    expect(matchesPath('/admin/theme/**', '/admin/theme/42/edit')).toBe(true)
  })

  it('given a trailing "**", when the base path differs, then it does not match', () => {
    expect(matchesPath('/admin/theme/**', '/admin/workspace/42')).toBe(false)
  })

  it('given a trailing "**", when the location is shorter than the base path, then it does not match', () => {
    expect(matchesPath('/admin/theme/**', '/admin')).toBe(false)
  })

  it('given a non-trailing "**", when the location has one segment in its place, then it matches', () => {
    expect(matchesPath('/admin/**/edit', '/admin/theme/edit')).toBe(true)
  })

  it('given a non-trailing "**", when the location has several segments in its place, then it does not match', () => {
    expect(matchesPath('/admin/**/edit', '/admin/theme/42/edit')).toBe(false)
  })

  it('given a mixed segment, when the location matches it only as a wildcard, then it does not match', () => {
    expect(matchesPath('/admin/user*', '/admin/users')).toBe(false)
  })

  it('given a mixed segment, when the location contains it literally, then it matches', () => {
    expect(matchesPath('/admin/user*', '/admin/user*')).toBe(true)
  })

  it('given a trailing slash on the pattern, when the location has none, then it matches', () => {
    expect(matchesPath('/admin/theme/', '/admin/theme')).toBe(true)
  })

  it('given a trailing slash on the location, when the pattern has none, then it matches', () => {
    expect(matchesPath('/admin/theme/*', '/admin/theme/42/')).toBe(true)
  })
})

describe('comparePathPrecedence', () => {
  const ranked = (path: string, sequence: number): RankedPath => ({ path, sequence })
  const best = (...paths: RankedPath[]) => [...paths].sort(comparePathPrecedence)[0].path

  it('given an exact path and a pattern covering it, when ranking, then the exact path wins', () => {
    expect(best(ranked('/admin/theme/**', 2), ranked('/admin/theme/search', 1))).toBe('/admin/theme/search')
  })

  it('given an exact path and a trailing "**" on it, when ranking, then the exact path wins', () => {
    expect(best(ranked('/admin/theme/**', 2), ranked('/admin/theme', 1))).toBe('/admin/theme')
  })

  it('given two patterns, when one has more literal characters, then it wins', () => {
    expect(best(ranked('/admin/**', 2), ranked('/admin/theme/**', 1))).toBe('/admin/theme/**')
  })

  it('given equal literal characters, when one has fewer wildcard segments, then it wins', () => {
    expect(best(ranked('/admin/*/*', 2), ranked('/admin/**', 1))).toBe('/admin/**')
  })

  it('given equal specificity, when ranking, then the most recently published path wins', () => {
    expect(best(ranked('/admin/*/theme', 1), ranked('/admin/theme/*', 2))).toBe('/admin/theme/*')
  })
})
