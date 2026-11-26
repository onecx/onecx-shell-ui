/** Matches exactly one path segment. */
export const SINGLE_SEGMENT_WILDCARD = '*'
/** As last segment, matches zero or more remaining path segments; elsewhere it behaves like `*`. */
export const MULTI_SEGMENT_WILDCARD = '**'

/**
 * A document title path (exact path or pattern) together with the order in which it was published.
 */
export interface RankedPath {
  readonly path: string
  /** Increasing number of the publication; a higher number was published more recently. */
  readonly sequence: number
}

/**
 * Checks whether a document title path matches a location pathname.
 * Wildcards are only recognized as whole segments: `*` matches exactly one segment, a trailing `**` matches zero or
 * more remaining segments, a non-trailing `**` behaves like `*` and mixed segments (e.g. `user*`) are literal.
 * A trailing `/` is ignored on both sides.
 * @param pattern exact path or pattern, e.g. `/admin/theme/**`
 * @param pathname location pathname, e.g. `/admin/theme/search`
 * @returns true if the pathname is covered by the pattern
 * @example matchesPath('/admin/theme/**', '/admin/theme') // true
 */
export function matchesPath(pattern: string, pathname: string): boolean {
  const patternSegments = toSegments(pattern)
  const pathSegments = toSegments(pathname)
  if (patternSegments.at(-1) === MULTI_SEGMENT_WILDCARD) {
    const fixedSegments = patternSegments.slice(0, -1)
    return pathSegments.length >= fixedSegments.length && segmentsMatch(fixedSegments, pathSegments)
  }
  return pathSegments.length === patternSegments.length && segmentsMatch(patternSegments, pathSegments)
}

/**
 * Orders document title paths by precedence, highest first: more literal characters, then fewer wildcard segments,
 * then the most recently published. An exact path has no wildcards and therefore beats every pattern covering it.
 * @returns a negative number if `a` takes precedence over `b`, a positive number if `b` takes precedence over `a`
 */
export function comparePathPrecedence(a: RankedPath, b: RankedPath): number {
  const specificityA = specificity(a.path)
  const specificityB = specificity(b.path)
  return (
    specificityB.literalChars - specificityA.literalChars ||
    specificityA.wildcards - specificityB.wildcards ||
    b.sequence - a.sequence
  )
}

function toSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment !== '')
}

function isWildcard(segment: string): boolean {
  return segment === SINGLE_SEGMENT_WILDCARD || segment === MULTI_SEGMENT_WILDCARD
}

function segmentsMatch(patternSegments: string[], pathSegments: string[]): boolean {
  return patternSegments.every((segment, index) => isWildcard(segment) || segment === pathSegments[index])
}

function specificity(path: string): { literalChars: number; wildcards: number } {
  const segments = toSegments(path)
  const literals = segments.filter((segment) => !isWildcard(segment))
  return {
    literalChars: literals.reduce((sum, segment) => sum + segment.length, 0),
    wildcards: segments.length - literals.length
  }
}
