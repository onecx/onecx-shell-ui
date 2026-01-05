import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import { Target, viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// Issue: Translations not working
// Issue: Styles not being able to be fetched
// Issue: Module federation disabled

export default defineConfig(({ command, mode }) => {
  console.log('mode', mode)
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

  assets.push(...(mode === 'local-env' ? localEnvAssets : []))

  return {
    plugins: [
      // Required to process Angular files
      angular({
        inlineStylesExtension: 'scss'
      }),
      // Required to read path mappings from tsconfig.json
      nxViteTsPaths(),
      viteStaticCopy({
        targets: [...assets]
      })
    ],
    build: {
      target: ['es2020'],
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
                // Optionally add logLevel: 'debug'
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
