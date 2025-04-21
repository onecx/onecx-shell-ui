export function extractVariablesFromCss(css: string): string {
  const matches = css.match(/:root\s*\{[^}]*\}/g)
  if (!matches) return ''

  return matches.join(' ')
}

export function extractStylesFromCss(css: string): string {
  return css.replace(/:root\s*\{[^}]*\}/g, '')
}

export function createStyleElement(content: string, dataAttributes?: { [key: string]: string }) {
  const style = document.createElement('style')

  style.appendChild(document.createTextNode(content))
  if (dataAttributes) {
    Object.keys(dataAttributes).forEach((key) => {
      style.dataset[key] = dataAttributes[key]
    })
  }
  document.head.appendChild(style)
}

export function updateStyleElement(selector: string, content: string) {
  const styleElement = document.head.querySelector(selector)
  if (!styleElement) return

  styleElement.textContent = content
}
