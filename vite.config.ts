import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import { federation } from '@module-federation/vite'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { Target, viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

/**
 * This file configures Vite for the OneCX Shell UI application.
 *
 * It sets up:
 * - Angular support via the analogjs plugin.
 * - Module Federation
 * - Path mappings from tsconfig.json using Nx plugin.
 * - Static asset copying.
 * - Custom build and server configurations.
 *
 *  It operates in 2 modes:
 * - Default mode for production builds and standard development.
 * - "local-env" mode for local environment development with specific asset handling and proxy settings.
 * @see https://vitejs.dev/config/
 */

const pckg = require('./package.json')

const moduleFederationPlugin = () =>
  federation({
    name: 'onecx-shell-ui',
    filename: 'remoteEntry.js',
    exposes: {
      './OneCXVersionInfoComponent': 'src/app/remotes/version-info/version-info.component.main.ts',
      './OneCXShellToastComponent': 'src/app/remotes/shell-toast/shell-toast.component.main.ts'
    },
    shared: {
      // requiredVersion "auto" not supported
      '@angular/core': { requiredVersion: pckg['dependencies']['@angular/core'] },
      '@angular/common': { requiredVersion: pckg['dependencies']['@angular/common'] },
      '@angular/common/http': {
        requiredVersion: pckg['dependencies']['@angular/common/http']
      },
      '@angular/elements': { requiredVersion: pckg['dependencies']['@angular/elements'] },
      '@angular/forms': { requiredVersion: pckg['dependencies']['@angular/forms'] },
      '@angular/platform-browser': {
        requiredVersion: pckg['dependencies']['@angular/platform-browser']
      },
      '@angular/router': { requiredVersion: pckg['dependencies']['depName'] },
      '@ngx-translate/core': { requiredVersion: pckg['dependencies']['depName'] },
      primeng: { requiredVersion: pckg['dependencies']['depName'] },
      rxjs: { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/accelerator': { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/angular-accelerator': { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/angular-auth': { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/angular-integration-interface': {
        requiredVersion: pckg['dependencies']['depName']
      },
      '@onecx/angular-remote-components': {
        requiredVersion: pckg['dependencies']['depName']
      },
      '@onecx/angular-utils': { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/angular-webcomponents': { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/integration-interface': { requiredVersion: pckg['dependencies']['depName'] },
      '@onecx/portal-layout-styles': { requiredVersion: pckg['dependencies']['depName'] }
    }
  })

export default defineConfig(({ command, mode }) => {
  // list of assets not located in public folder to be copied to dist folder
  const assets: Target[] = [
    { src: './node_modules/@onecx/angular-utils/assets/**/*', dest: 'onecx-angular-utils/assets' },
    { src: './node_modules/@onecx/angular-accelerator/assets/**/*', dest: 'onecx-angular-accelerator/assets' },
    {
      src: './pre_loaders/angular-18/node_modules/@onecx/portal-integration-angular/assets/**/*',
      dest: 'onecx-portal-lib/assets'
    },
    {
      src: './src/assets/**/*',
      dest: 'assets'
    }
  ]

  // list of additional assets for local-env mode
  // these are prepared by setup-local-env.sh script
  // and copied from tmp-local-env-assets folder on serve command
  const localEnvAssets: Target[] = [
    // preloaders
    {
      src: './tmp-local-env-assets/pre_loaders/**/*',
      dest: 'pre_loaders'
    },
    {
      src: './tmp-local-env-assets/portal-layout-styles.css',
      dest: ''
    },
    {
      src: './tmp-local-env-assets/shell-styles.css',
      dest: ''
    },
    // glob for all font files
    {
      src: './tmp-local-env-assets/*.{woff,woff2,ttf,eot,svg}',
      dest: ''
    }
  ]

  assets.push(...(mode === 'local-env' && command === 'serve' ? localEnvAssets : []))

  return {
    plugins: [
      // Angular support
      angular({
        inlineStylesExtension: 'scss'
      }),
      // Path mappings from tsconfig.json using Nx plugin
      nxViteTsPaths(),
      // Static asset copying
      viteStaticCopy({
        targets: [...assets]
      }),
      // Custom HTML base href transform
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace('<base href="/" />', '<base href="/onecx-shell/" />')
        }
      },
      // Module Federation
      moduleFederationPlugin()
    ],
    build: {
      // required for module federation top-level await but does not support all browsers (https://caniuse.com/?search=top+level+await)
      // could be replaced with vite-plugin-top-level-await to support more browsers
      target: 'esnext',
      outDir: 'dist/onecx-shell-ui',
      rollupOptions: {
        input: {
          main: 'index.html',
          // Include CSS files as separate entry points
          'portal-layout-styles': path.resolve(__dirname, 'src/portal-layout-styles.scss'),
          'shell-styles': path.resolve(__dirname, 'src/shell-styles.scss')
        },
        output: {
          // Place CSS assets in /assets directory
          assetFileNames: (assetInfo) => {
            if (assetInfo.names.some((name) => name.endsWith('.css'))) {
              return '[name][extname]'
            }
            return '[name][extname]'
          }
        }
      }
    },
    server: {
      // Development server configuration for local-env mode
      ...(mode === 'local-env'
        ? {
            host: '0.0.0.0',
            allowedHosts: true,
            origin: 'http://localhost:4300/onecx-shell',
            port: 4300,
            proxy: {
              '/onecx-shell/shell-bff': {
                target: 'http://onecx-shell-bff',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/onecx-shell\/shell-bff/, '')
              }
            }
          }
        : {})
    },
    // This does not work
    // ...(mode === 'local-env' ? { base: '/onecx-shell/' } : {})
    base: '/onecx-shell/' // Does not work with build:local-env but does work with build??
  }
})
