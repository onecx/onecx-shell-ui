import config from './module-federation.config'
import { withModuleFederation } from '@nx/angular/module-federation'
// const { ModifySourcePlugin, ReplaceOperation } = require('modify-source-webpack-plugin')

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

export default withModuleFederation(config, {
  // plugins: [modifyPrimeNgPlugin],
  // module: { parser: { javascript: { importMeta: false } } }
})
