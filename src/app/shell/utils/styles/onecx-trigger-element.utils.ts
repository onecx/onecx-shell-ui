declare global {
  interface Window {
    onecxTriggerElement: EventTarget | null
  }
}

export function initializeOnecxTriggerElementListener() {
  // Detect last used element and save it as the current trigger
  document.addEventListener('mouseover', (event) => {
    updateOnecxTriggerElement(event.target)
  })

  document.addEventListener('focusin', (event) => {
    updateOnecxTriggerElement(event.target)
  })
}

export function getOnecxTriggerElement() {
  return window.onecxTriggerElement
}

function updateOnecxTriggerElement(target: EventTarget | null) {
  window.onecxTriggerElement = target
}
