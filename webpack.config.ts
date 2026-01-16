import config from './module-federation.config'
import { withModuleFederation } from '@nx/angular/module-federation'

export default withModuleFederation(config)

// const plugins = webpackConfig.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))
// const modifyPrimeNgPlugin = new ModifySourcePlugin({
//   rules: [
//     {
//       test: (module) => {
//         return module.resource && module.resource.includes('primeng')
//       },
//       operations: [
//         new ReplaceOperation(
//           'all',
//           'document\\.createElement\\(',
//           'document.createElementFromPrimeNg({"this": this, "arguments": Array.from(arguments)},'
//         ),
//         new ReplaceOperation('all', 'Theme.setLoadedStyleName', '(function(_){})')
//       ]
//     }
//   ]
// })

// // Replace createElement only in @angular/platform-browser SharedStylesHost
// const modifyAngularCorePlugin = new ModifySourcePlugin({
//   rules: [
//     {
//       test: (module) => {
//         return module.resource && module.resource.includes('@angular/platform-browser')
//       },
//       operations: [
//         new ReplaceOperation(
//           'all',
//           "this\\.doc\\.createElement\\(\\'style\\'",
//           "this.doc.createElementFromSharedStylesHost({'this': this, 'arguments': Array.from(arguments)},'style'"
//         )
//       ]
//     }
//   ]
// })

// module.exports = {
//   ...webpackConfig,
//   plugins: [...plugins, modifyPrimeNgPlugin, modifyAngularCorePlugin],
//   module: { parser: { javascript: { importMeta: false } } }
// }
