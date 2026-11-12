const sourcePatchLoader = require('./source-patch.loader')

describe('sourcePatchLoader', () => {
  const optimusSource = [
    "document.createElement('style');",
    "document.createElement('div');",
    "Theme.setLoadedStyleName('common');",
    "Theme.setLoadedStyleName('layer-order');",
    "Base.setLoadedStyleName('base');",
    "Base.setLoadedStyleName('button');"
  ].join('\n')
  const patchedOptimusSource = [
    'document.createOnecxElement({"this": this, "arguments": Array.from(arguments)},\'style\');',
    'document.createOnecxElement({"this": this, "arguments": Array.from(arguments)},\'div\');',
    "(function(_){})('common');",
    "(function(_){})('layer-order');",
    "(function(_){})('base');",
    "(function(_){})('button');"
  ].join('\n')

  it.each([
    '/app/node_modules/@openng/optimus-ui/fesm2022/basecomponent.mjs',
    '/app/node_modules/@openng/optimus-ui-utils/dist/index.mjs',
    'C:\\app\\node_modules\\@openng\\optimus-ui\\fesm2022\\basecomponent.mjs',
    'C:\\app\\node_modules\\@openng\\optimus-ui-utils\\dist\\index.mjs'
  ])('patches all element creation and both style guards in %s', (resourcePath) => {
    expect(sourcePatchLoader.call({ resourcePath }, optimusSource)).toBe(patchedOptimusSource)
  })

  it.each([
    '/app/node_modules/@angular/platform-browser/fesm2022/browser.mjs',
    'C:\\app\\node_modules\\@angular\\platform-browser\\fesm2022\\browser.mjs'
  ])('preserves the Angular SharedStylesHost patch in %s', (resourcePath) => {
    const source = "this.doc.createElement('style'); this.doc.createElement('style');"
    const patched =
      "this.doc.createElementFromSharedStylesHost({'this': this, 'arguments': Array.from(arguments)},'style');"

    expect(sourcePatchLoader.call({ resourcePath }, source)).toBe(`${patched} ${patched}`)
    expect(sourcePatchLoader.call({ resourcePath }, optimusSource)).toBe(optimusSource)
  })

  it.each([
    '/app/src/example.js',
    '/app/node_modules/@openng/optimus-ui-themes/index.mjs',
    '/app/node_modules/@openng/optimus-ui-utils-extra/index.mjs',
    '/app/node_modules/@angular/platform-browser-extra/index.mjs',
    '/app/node_modules/primeng/index.mjs',
    undefined
  ])('leaves unrelated resources unchanged: %s', (resourcePath) => {
    const source = `${optimusSource}\nthis.doc.createElement('style');`

    expect(sourcePatchLoader.call({ resourcePath }, source)).toBe(source)
  })

  it('only replaces exact style-setter references', () => {
    const source = 'OtherTheme.setLoadedStyleName(); ThemeXsetLoadedStyleName(); Base.setLoadedStyleNames();'

    expect(sourcePatchLoader.call({ resourcePath: '/app/node_modules/@openng/optimus-ui/base.mjs' }, source)).toBe(
      source
    )
  })
})
