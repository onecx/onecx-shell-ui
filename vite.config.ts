import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import { federation } from '@module-federation/vite'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { Target, viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

const pckg = require('./package.json')

const moduleFederationPlugin = () =>
  federation({
    name: 'onecx-shell-ui',
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

  // copy all font portal-layout-styles and shell-styles including fonts
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
      // Required to process Angular files
      angular({
        inlineStylesExtension: 'scss'
      }),
      // Required to read path mappings from tsconfig.json
      nxViteTsPaths(),
      // Required to copy static assets not located in public folder
      viteStaticCopy({
        targets: [...assets]
      }),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace('<base href="/" />', '<base href="/onecx-shell/" />')
        }
      },
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
          'portal-layout-styles': path.resolve(__dirname, 'src/portal-layout-styles.scss'),
          'shell-styles': path.resolve(__dirname, 'src/shell-styles.scss')
        },
        output: {
          assetFileNames: (assetInfo) => {
            // Place CSS assets in /assets
            if (assetInfo.names.some((name) => name.endsWith('.css'))) {
              return '[name][extname]'
            }
            return '[name][extname]'
          }
        }
      }
    },
    server: {
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
