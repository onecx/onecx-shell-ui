# OneCX Shell User Interface

OneCX Shell is the heart of the OneCX platform. It’s the most important OneCX core Application that glues together all Applications and makes the platform seem like a single page application.

Useful Links:

. [OneCX Shell Documentation](https://onecx.github.io/docs/documentation/current/onecx-docs-overview/architecture/shell.html)

. [OneCX Local Environment](https://onecx.github.io/docs/documentation/current/onecx-local-env/index.html)

## Source maps

- Source maps are generated for all shell remotes and preloaders (the shell is built with Rspack; the pre-loaders use Webpack).
- In Docker images, delivery of `*.map` files is controlled at runtime with `SOURCE_MAPS_ACCESS_RULE`.
	- Default: `deny all;` (recommended for production)
	- Development example: `allow all;`
