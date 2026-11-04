/**
 * Rspack loader that re-implements the two `ModifySourcePlugin` patches the
 * webpack build applied to third-party sources.
 *
 * It performs plain source-string (global) replacements and is only applied to
 * modules whose resource path matches the original `ModifySourcePlugin` rules:
 *   - `@openng/optimus-ui`    -> Optimus UI `document.createElement` + theme-load patch
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
  // disable the style-name setter (avoids duplicate style injection).
  if (resourcePath.includes('@openng/optimus-ui')) {
    result = result.replace(
      /document\.createElement\(/g,
      'document.createOnecxElement({"this": this, "arguments": Array.from(arguments)},'
    )
    result = result.replace(/Theme.setLoadedStyleName/g, '(function(_){})')
  }

  // Angular `SharedStylesHost` patch: route the `<style>` element creation
  // through a runtime hook.
  if (resourcePath.includes('@angular/platform-browser')) {
    result = result.replace(
      /this\.doc\.createElement\('style'/g,
      "this.doc.createElementFromSharedStylesHost({'this': this, 'arguments': Array.from(arguments)},'style'"
    )
  }

  return result
}
