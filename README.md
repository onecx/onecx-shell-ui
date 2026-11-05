# OneCX Shell User Interface

OneCX Shell is the heart of the OneCX platform. It’s the most important OneCX core Application that glues together all Applications and makes the platform seem like a single page application.

Useful Links:

. [OneCX Shell Documentation](https://onecx.github.io/docs/documentation/current/onecx-docs-overview/architecture/shell.html)

. [OneCX Local Environment](https://onecx.github.io/docs/documentation/current/onecx-local-env/index.html)

## Styling

The Shell's own content (v9 / Angular 22 surface: slot groups, loading/error/About layouts, initial splash) is styled with **Tailwind CSS v4**, built with the Optimus **styled mode** theme from `@openng/optimus-ui-tailwindcss`.

- **Tailwind is owned by the Shell build.** The `shell-styles` entry (`src/shell-styles.css`) is the single stylesheet that imports Tailwind (`@import 'tailwindcss'` + `@import '@openng/optimus-ui-tailwindcss'`), and it is the only place where Tailwind's preflight/reset and generated utilities are emitted. The Angular/webpack pipeline shares one PostCSS pipeline across every stylesheet it emits (global styles, the legacy `portal-layout-styles` bundle, component styles). Because Tailwind v4's `@tailwindcss/postcss` plugin eagerly resolves `@import`s and `url()`s, it must never run on anything else: `scripts/tailwind-shell-postcss.js` is a thin PostCSS wrapper registered in `postcss.config.json` that runs `@tailwindcss/postcss` only when the file being compiled is `src/shell-styles.css` and is a no-op for every other file. The reset and utilities therefore never leak into the legacy bundle, component styles, or MFE styles.
- **Utilities are generated for what the Shell uses.** `@source "./"` scans the Shell's `src/` so every utility class referenced in Shell templates is produced at build time.
- **The `shell-styles` bundle is scoped at runtime** to the `ocx-shell-root` element (via `@scope`, with a polyfill for older browsers), so Shell styles — including Tailwind's reset — apply only to Shell content.
- **Legacy v5 styling is unchanged.** `src/portal-layout-styles.scss` (and the `@onecx/portal-layout-styles` package) still provides PrimeFlex-based styling for legacy v5 MFEs.
- **PrimeFlex is a build-time-only dependency** of the legacy `portal-layout-styles` entry. It is no longer bundled for the Shell's modern content, which uses Tailwind utilities.
- **Slot direction classes use Tailwind names.** Slot groups/slots emit Tailwind direction classes (e.g. `flex-col`, `flex-col-reverse`, `justify-between`) rather than PrimeFlex ones; consumers passing custom classes should likewise use Tailwind utilities.

## Source maps

- Source maps are generated for all shell remotes and preloaders (the Angular 22 shell is built with Rspack and uses the `angular_22` federation share scope; the pre-loaders use Webpack).
- In Docker images, delivery of `*.map` files is controlled at runtime with `SOURCE_MAPS_ACCESS_RULE`.
	- Default: `deny all;` (recommended for production)
	- Development example: `allow all;`

## Angular Rspack compilation

Build and serve targets are inferred by `@nx/rspack/plugin`. Angular build options
live in `rspack.config.ts`; `project.json` retains the named configurations and
defaults. `npm start`, `npm run start:local-env`, and `nx build` keep their existing
defaults. Use `nx build --configuration=development` for an unoptimized build.
For direct Rspack CLI usage, select a configuration with
`--env configuration=production` (or `development` / `local-env`).

The default server uses `proxy.conf.js`; `local-env` uses
`proxy.local-env.conf.js` and the `/onecx-shell/` base path. Override the listening
port with `npm start -- --port=5000`. TypeScript configuration files are loaded
with SWC (`@swc-node/register` for Nx and ts-node's `swc` option for the CLI).

The Nx 23.3 / Angular 22 build defaults to in-process TypeScript compilation
(`NG_BUILD_PARALLEL_TS=false`). The worker path fails because Nx passes a compiler
options callback that Angular 22 cannot clone. Keep the default until the Nx
integration supports Angular 22's worker API.

In-process compilation also requires explicit Angular hash initialization.
`rspack.config.ts` awaits this before creating the build configuration, resolving
the internal hash utility from the compiler's own `@angular/build` installation.
The config also shuts down Angular's shared Sass worker pool when the compiler
closes, allowing one-shot CLI builds to exit. Revisit these compatibility
workarounds when upgrading Nx or Angular.
