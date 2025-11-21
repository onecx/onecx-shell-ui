declare global {
  interface Window {
    onecxTriggerElement: EventTarget | null
  }
}

/**
 * Initializes the OneCX trigger element listener to track the last interacted element.
 *
 * The following events are considered as trigger changes:
 * - Mouseover: When the user hovers over an element.
 * - Focusin: When an element gains focus (e.g., via keyboard navigation).
 *
 * The last interacted element is stored in `window.onecxTriggerElement`.
 */
export function initializeOnecxTriggerElementListener() {
  // Detect last used element and save it as the current trigger
  document.addEventListener('mouseover', (event) => {
    updateOnecxTriggerElement(event.target)
  })

  document.addEventListener('focusin', (event) => {
    updateOnecxTriggerElement(event.target)
  })
}

/**
 * Retrieves the current OneCX trigger element.
 *
 * If the trigger element is null, it falls back to the first element with a `data-style-id` attribute
 * within the `.onecx-body` container.
 * @returns The current OneCX trigger element or a fallback element. Returns null if no suitable element is found.
 */
export function getOnecxTriggerElement() {
  if (window.onecxTriggerElement !== null) {
    return window.onecxTriggerElement
  }

  console.warn('OneCX Trigger Element is null, will fallback to app trigger element as content source.')
  const bodyElement = document.querySelector('.onecx-body')
  if (!bodyElement) {
    console.warn('OneCX Body Element not found. Could not create fallback trigger element.')
    return null
  }
  const appElement = bodyElement.querySelector('[data-style-id]')
  if (!appElement) {
    console.warn('No element with data-style-id found inside OneCX Body. Could not create fallback trigger element.')
    return null
  }

  return appElement
}

function updateOnecxTriggerElement(target: EventTarget | null) {
  window.onecxTriggerElement = target
}
