#!/bin/bash

# clean previous build artifacts
echo "Cleaning previous build artifacts..." && \
rm -rf dist node_modules/.vite .nx && \
# execute nx build for local env to preserve local-env specific settings
echo "Building onecx-shell-ui for local environment..." && \
npm run build:local-env

# prepare local env assets
echo "Preparing local environment assets..." && \
rm -rf ./tmp-local-env-assets && \
mkdir -p ./tmp-local-env-assets && \
chmod -R 777 ./tmp-local-env-assets && \
cp dist/onecx-shell-ui/*.css ./tmp-local-env-assets && \
cp dist/onecx-shell-ui/pre_loaders ./tmp-local-env-assets/pre_loaders -r && \
find dist/onecx-shell-ui/ -maxdepth 1 -type f \( -iname "*.woff" -o -iname "*.woff2" -o -iname "*.ttf" -o -iname "*.eot" -o -iname "*.otf" -o -iname "*.svg" \) -exec cp {} ./tmp-local-env-assets \;