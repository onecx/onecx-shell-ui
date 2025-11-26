import { NgClassInputType } from '../components/slot-group/slot-group.component'

/**
 * Normalizes various class input formats into a single space-separated string.
 *
 * This is needed because custom classes can be provided as arrays, sets, or objects
 * (e.g.: { 'active': true }), but we need to merge them with base class strings.
 *
 * @param classes - CSS classes in string, array, set, or object format
 * @returns A space-separated string of CSS class names
 */
export function normalizeClassesToString(classes: NgClassInputType): string {
  if (!classes) return ''

  if (Array.isArray(classes) || classes instanceof Set) {
    return [...classes].join(' ')
  }

  if (typeof classes === 'object') {
    return Object.keys(classes)
      .filter((key) => classes[key])
      .join(' ')
  }

  return classes.trim()
}
