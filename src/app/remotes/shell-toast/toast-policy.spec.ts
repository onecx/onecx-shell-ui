import { ToastMessageOptions } from 'primeng/api'

import { applyToastPolicy, DEFAULT_TOAST_LIFE_MS } from './toast-policy'

describe('applyToastPolicy', () => {
  it.each(['error', 'warn', 'warning'])('makes %s toasts sticky and ignores app life/sticky settings', (severity) => {
    const result = applyToastPolicy({ severity, summary: 's', life: 1000, sticky: false })
    expect(result).toEqual({ severity, summary: 's', sticky: true })
    expect(result).not.toHaveProperty('life')
    expect(applyToastPolicy({ severity, summary: 's' }).sticky).toBe(true)
  })

  it.each(['info', 'success'])('gives %s toasts a default life of 10 s', (severity) => {
    const result = applyToastPolicy({ severity, summary: 's' })
    expect(result.sticky).toBe(false)
    expect(result.life).toBe(DEFAULT_TOAST_LIFE_MS)
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
    const message: ToastMessageOptions = { severity: 'error', summary: 's', life: 1000 }
    applyToastPolicy(message)
    expect(message).toEqual({ severity: 'error', summary: 's', life: 1000 })
  })
})
