import { ToastMessageOptions } from 'primeng/api'

/** Minimum lifetime (ms) of info/success toasts that do not set an explicit life. WCAG 2.2.1 Timing Adjustable. */
export const DEFAULT_TOAST_LIFE_MS = 10000

/** Severities whose toasts are always sticky. `warning` is accepted as an alias of `warn`. */
const STICKY_SEVERITIES: ReadonlySet<string | undefined> = new Set(['error', 'warn', 'warning'])

/**
 * Shell-wide toast timing policy (WCAG 2.2.1, 4.1.3).
 *
 * - `error`, `warn` and `warning` toasts are always sticky: they stay until the user closes them. An app-provided `life` or
 *   `sticky: false` is ignored for these severities (`life` is removed).
 * - `info` and `success` toasts use the app-provided `life` if set (and `sticky` is not requested),
 *   otherwise {@link DEFAULT_TOAST_LIFE_MS}.
 * - Hovering or focusing a toast pauses its timer (see OneCXShellToastComponent).
 *
 * The portal message (with the severity added at runtime by PortalMessageService) is passed through as PrimeNG toast options.
 */
export function applyToastPolicy(message: ToastMessageOptions): ToastMessageOptions {
  if (STICKY_SEVERITIES.has(message.severity)) {
    const { life, ...rest } = message // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, sticky: true }
  }
  if (message.sticky) {
    return message
  }
  return { ...message, sticky: false, life: message.life ?? DEFAULT_TOAST_LIFE_MS }
}
