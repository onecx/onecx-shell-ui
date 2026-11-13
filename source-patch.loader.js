/**
 * Rspack loader that re-implements the two `ModifySourcePlugin` patches the
 * webpack build applied to third-party sources.
 *
 * It performs plain source-string (global) replacements and is only applied to
 * modules whose resource path matches the source-patch rules:
 *   - `@openng/optimus-ui` / `@openng/optimus-ui-utils` -> element creation + style-load patches
 *   - `@angular/platform-browser` -> Angular `SharedStylesHost` patch
 *
 * The replacement strings contain no `$` so they are safe to use verbatim with
 * `String#replace` (no special replacement-pattern handling required), matching
 * the `ReplaceOperation('all', search, replace)` semantics of the webpack plugin.
 */
module.exports = function sourcePatchLoader(source) {
  const resourcePath = this.resourcePath || ''

  let result = source

  // Optimus UI patch: route `document.createElement(` through a runtime hook and
  // disable shared style-name guards so each scoped app can load its styles.
  if (/[/\\]node_modules[/\\]@openng[/\\]optimus-ui(-utils)?[/\\]/.test(resourcePath)) {
    result = result.replace(
      /document\.createElement\(/g,
      'document.createOnecxElement({"this": this, "arguments": Array.from(arguments)},'
    )
    result = result.replace(/\b(Theme|Base)\.setLoadedStyleName\b/g, '(function(_){})')
  }

  // Angular `SharedStylesHost` patch: route the `<style>` element creation
  // through a runtime hook.
  if (/[/\\]node_modules[/\\]@angular[/\\]platform-browser[/\\]/.test(resourcePath)) {
    result = result.replace(
      /this\.doc\.createElement\('style'/g,
      "this.doc.createElementFromSharedStylesHost({'this': this, 'arguments': Array.from(arguments)},'style'"
    )
  }

  return result
}
