#!/bin/bash

# This script builds the onecx-shell-ui project for the local environment
# and prepares the necessary assets in a temporary directory.
# It performs the following steps:
# 1. Cleans previous build artifacts.
# 2. Executes the build command for the local environment.
# 3. Prepares the local environment assets by copying relevant files
#    to a temporary directory.

# This script is required to correctly build and copy assets for the local environment.

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