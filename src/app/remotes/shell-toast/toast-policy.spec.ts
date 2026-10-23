import { applyToastPolicy, DEFAULT_TOAST_LIFE_MS, ToastMessage } from './toast-policy'

describe('applyToastPolicy', () => {
  it.each(['error', 'warn', 'warning'])('makes %s toasts sticky and ignores app life/sticky settings', (severity) => {
    expect(applyToastPolicy({ severity, summary: 's', life: 1000, sticky: false })).toEqual(
      expect.objectContaining({ sticky: true })
    )
    expect(applyToastPolicy({ severity, summary: 's' }).sticky).toBe(true)
  })

  it.each(['info', 'success'])('gives %s toasts a default life of at least 10 s', (severity) => {
    const result = applyToastPolicy({ severity, summary: 's' })
    expect(result.sticky).toBe(false)
    expect(result.life).toBe(DEFAULT_TOAST_LIFE_MS)
    expect(DEFAULT_TOAST_LIFE_MS).toBeGreaterThanOrEqual(10000)
  })

  it.each(['info', 'success'])('honours an explicit life for %s toasts', (severity) => {
    expect(applyToastPolicy({ severity, summary: 's', life: 20000 }).life).toBe(20000)
  })

  it('keeps an explicit sticky info toast sticky', () => {
    expect(applyToastPolicy({ severity: 'info', summary: 's', sticky: true }).sticky).toBe(true)
  })

  it('treats a toast without severity like info', () => {
    expect(applyToastPolicy({ summary: 's' })).toEqual({ summary: 's', sticky: false, life: DEFAULT_TOAST_LIFE_MS })
  })

  it('does not mutate the input message', () => {
    const message: ToastMessage = { severity: 'error', summary: 's' }
    applyToastPolicy(message)
    expect(message).toEqual({ severity: 'error', summary: 's' })
  })
})
