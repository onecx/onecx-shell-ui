import { updateAngularComponentsStyles } from './update-angular-components-styles.utils'
import { updateRequiredWrappingStyles } from './update-required-wrapping-styles.utils'

/**
 * Registers a listener that utilizes MutationObserver to validate styles added to the document head.
 *
 * Whenever new style element, containing Angular component styles, is added to head of the document, this initializer is going to replace PrimeNg prefix of all CSS variables with the scopeId of the application.
 *
 * The listener assumes that the style element containing the "_nghost" attribute is Angular component style.
 *
 * The listener finds the scopeId data by looking for "_nghost" owner and looking for the closest styleId element.
 */
export async function styleChangesListenerInitializer() {
  const observer = new MutationObserver((mutationList: MutationRecord[]) => updateStyles(mutationList))
  observer.observe(document.head, {
    childList: true
  })
}

function updateStyles(mutationList: MutationRecord[]) {
  updateAngularComponentsStyles(mutationList)
  updateRequiredWrappingStyles(mutationList)
}
