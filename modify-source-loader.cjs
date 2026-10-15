/**
 * Rspack source-patch loader.
 *
 * Rspack has no `modify-source-webpack-plugin`, so the two `ModifySourcePlugin`
 * rules that lived in `webpack.config.ts` are reimplemented here as a plain
 * source-string transform loader. It replaces the exact same substrings the
 * webpack `ReplaceOperation`s (type `'all'`) targeted, using the identical
 * regex source strings and replacement values so behaviour is unchanged:
 *
 *   - PrimeNG: route `document.createElement(` through the app's
 *     `document.createElementFromPrimeNg` override (see primeng-overwrites.utils.ts),
 *     and stub out `Theme.setLoadedStyleName` so theme state does not leak.
 *   - Angular `SharedStylesHost` (@angular/platform-browser): route
 *     `this.doc.createElement('style')` through
 *     `document.createElementFromSharedStylesHost` (see
 *     shared-styles-host-overwrites.utils.ts).
 *
 * The loader is applied with `enforce: 'pre'` and scoped (via the rule's
 * `include`) to `node_modules/primeng` and `node_modules/@angular/platform-browser`,
 * mirroring the original `module.resource.includes(...)` test guards.
 */
const PRIMENG_OPS = [
  [
    'document\\.createElement\\(',
    'document.createElementFromPrimeNg({"this": this, "arguments": Array.from(arguments)},'
  ],
  ['Theme.setLoadedStyleName', '(function(_){})']
]

const ANGULAR_OPS = [
  [
    "this\\.doc\\.createElement\\(\\'style\\'",
    "this.doc.createElementFromSharedStylesHost({'this': this, 'arguments': Array.from(arguments)},'style'"
  ]
]

module.exports = function modifySourceLoader(source) {
  const resource = this.resource
  let out = source

  if (resource.includes('primeng')) {
    for (const [search, replace] of PRIMENG_OPS) {
      out = out.replace(new RegExp(search, 'g'), replace)
    }
  }

  if (resource.includes('@angular/platform-browser')) {
    for (const [search, replace] of ANGULAR_OPS) {
      out = out.replace(new RegExp(search, 'g'), replace)
    }
  }

  return out
}
