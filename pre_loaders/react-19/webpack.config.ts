import config from './module-federation.config'
import { withModuleFederation } from '@nx/react/module-federation'
import { composePlugins, withNx } from '@nx/webpack'
import { ModuleFederationPlugin } from '@module-federation/enhanced/webpack'

export default composePlugins(
  withNx(),
  withModuleFederation(config, {
    shareScope: 'react_19'
  }),
  (config) => {
    // Override ModuleFederationPlugin options to generate remoteEntry.mjs (ESM) instead of
    // remoteEntry.js (global script). The React variant of withModuleFederation defaults to
    // filename: 'remoteEntry.js' with remoteType: 'script', which is incompatible with the
    // shell's registerRemotes type: 'module'. Matching Angular preloaders' ESM output ensures
    // consistent loading via <script type="module"> across all preloaders.
    const mfPlugin = config.plugins?.find((p) => p instanceof ModuleFederationPlugin) as
      | ModuleFederationPlugin
      | undefined
    if (mfPlugin) {
      ;(mfPlugin as any)._options = {
        ...(mfPlugin as any)._options,
        filename: 'remoteEntry.mjs',
        library: { type: 'module' }
      }
    }
    return {
      ...config,
      devtool: 'source-map',
      experiments: {
        ...config.experiments,
        outputModule: true
      },
      output: {
        ...config.output,
        publicPath: 'auto',
        devtoolNamespace: 'onecx-react-19-loader',
        uniqueName: 'zzz_onecx-react-19-loader',
        module: true
      },
      resolve: {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          path: false,
          os: false,
          fs: false,
          tty: false,
          crypto: false,
          stream: false,
          zlib: false,
          http: false,
          https: false,
          net: false,
          tls: false,
          child_process: false,
          url: false,
          util: false,
          module: false
        },
        alias: {
          ...config.resolve?.alias,
          quill: false
        }
      },
      module: {
        ...config.module,
        parser: {
          ...config.module?.parser,
          javascript: { ...config.module?.parser?.javascript, importMeta: false }
        }
      }
    }
  }
)
