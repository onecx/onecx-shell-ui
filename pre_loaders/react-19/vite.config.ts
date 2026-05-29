import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import type { ModuleFederationOptions } from '@module-federation/vite'
import { dependencies } from './package.json'

// Plugin to close the Vite dev server after the build is complete
// Without this, the process would hang indefinitely after building resulting in blocked terminal
const closePlugin = (): Plugin => ({
  name: 'close',
  buildEnd(error) {
    if (error) {
      console.error('Build failed with error:', error)
      process.exit(1)
    }
    console.log('Build completed successfully.')
  },
  closeBundle(_) {
    console.log('Bundle closed successfully.')
    process.exit(0)
  }
})

/// <reference types='ModuleFederationOptions' />
const mfConfig: ModuleFederationOptions = {
  name: '􏿿onecx-react-19-loader',
  filename: 'remoteEntry.js',
  exposes: {
    './React19Loader': './src/bootstrap.ts'
  },
  // TODO: Replace with call
  shared: {
    react: {
      requiredVersion: dependencies.react,
      singleton: true,
      shareScope: 'react_19'
    },
    'react-dom': {
      requiredVersion: dependencies['react-dom'],
      singleton: true,
      shareScope: 'react_19'
    },
    'react-router': {
      requiredVersion: dependencies['react-router'],
      singleton: true,
      shareScope: 'react_19'
    },
    i18next: {
      requiredVersion: dependencies.i18next,
      singleton: true,
      shareScope: 'react_19'
    },
    'react-i18next': {
      requiredVersion: dependencies['react-i18next'],
      singleton: true,
      shareScope: 'react_19'
    },
    rxjs: {
      requiredVersion: dependencies.rxjs,
      singleton: true,
      shareScope: 'react_19'
    },
    primereact: {
      requiredVersion: dependencies.primereact,
      singleton: true,
      shareScope: 'react_19'
    },
    '@onecx/integration-interface': {
      requiredVersion: dependencies['@onecx/integration-interface'],
      shareScope: 'react_19'
    },
    '@onecx/react-utils': {
      requiredVersion: dependencies['@onecx/react-utils'],
      shareScope: 'react_19'
    },
    '@onecx/react-remote-components': {
      requiredVersion: dependencies['@onecx/react-remote-components'],
      shareScope: 'react_19'
    },
    '@onecx/react-integration-interface': {
      requiredVersion: dependencies['@onecx/react-integration-interface'],
      shareScope: 'react_19'
    },
    '@onecx/react-webcomponents': {
      requiredVersion: dependencies['@onecx/react-webcomponents'],
      shareScope: 'react_19'
    },
    '@onecx/react-auth': {
      requiredVersion: dependencies['@onecx/react-auth'],
      shareScope: 'react_19'
    },
    '@onecx/accelerator': {
      requiredVersion: dependencies['@onecx/accelerator'],
      shareScope: 'react_19'
    }
  },
  shareScope: 'react_19',
  manifest: true,
  // The path in the shell pre_loaders
  getPublicPath: `function() { if(!location.deploymentPath) { throw new Error('Deployment path is not defined. React 19 loader cannot determine public path.'); } return location.origin + location.deploymentPath + 'pre_loaders/onecx-react-19-loader/'; }`
}
export default defineConfig(() => {
  return {
    root: __dirname,
    plugins: [federation(mfConfig), react(), closePlugin()],
    build: {
      outDir: 'dist/onecx-react-19-loader',
      rollupOptions: {
        external: ['chart.js', 'char.js/auto', 'quill']
      }
    }
  }
})
