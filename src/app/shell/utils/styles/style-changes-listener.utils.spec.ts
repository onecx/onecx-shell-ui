import { styleChangesListenerInitializer } from './style-changes-listener.utils'

describe('styleChangesListenerInitializer', () => {
  it('observes new styles added to the document head', async () => {
    document.head.innerHTML = ''
    await styleChangesListenerInitializer()

    const style = document.createElement('style')
    style.textContent = 'body { color: red; }'
    document.head.appendChild(style)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.head.contains(style)).toBe(true)
  })
})
