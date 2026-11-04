'use strict'

/**
 * PostCSS plugin that compiles Tailwind CSS v4 for the Shell's `shell-styles` entry ONLY.
 *
 * The Angular/webpack style pipeline runs one shared PostCSS pipeline (postcss-import +
 * autoprefixer + whatever `postcss.config.json` declares) for every stylesheet it emits: the
 * global styles, the legacy `portal-layout-styles` bundle, component styles, and the
 * `shell-styles` entry. Tailwind v4's `@tailwindcss/postcss` plugin resolves `@import`s and
 * `url()`s eagerly, so it must never run on anything other than the single Tailwind entry:
 * applying it to the legacy PrimeFlex bundle breaks its `node_modules/...` imports and it
 * would rewrite the font URLs of any other stylesheet that imports `@openng/icons`.
 *
 * This wrapper runs `@tailwindcss/postcss` only when the current file is `src/shell-styles.css`
 * and is a no-op for every other file. Tailwind's preflight, generated utilities and its
 * import/url resolution therefore stay confined to the `shell-styles` bundle, which is scoped
 * to the Shell root at runtime.
 */
const path = require('path')

const SHELL_STYLES_ENTRY = 'shell-styles.css'

function createShellTailwindPlugin() {
  let tailwind

  return {
    postcssPlugin: 'onecx-shell-tailwind',
    async Once(root, { result }) {
      const file = (root.source && root.source.input && root.source.input.file) || result.opts.from
      if (!file) {
        return
      }
      // Match on the basename so it is independent of absolute/relative paths and any webpack query suffix.
      const baseName = path.basename(file.split('?')[0])
      if (baseName !== SHELL_STYLES_ENTRY) {
        return
      }

      const postcss = require('postcss')
      if (!tailwind) {
        tailwind = require('@tailwindcss/postcss')
      }
      // Tailwind resolves `@source` and `@import`s relative to the entry file, so pass its path as `from`.
      await postcss([tailwind()]).process(root, { from: file, map: false })
    }
  }
}
createShellTailwindPlugin.postcss = true

module.exports = createShellTailwindPlugin
