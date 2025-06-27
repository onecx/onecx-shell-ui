#!/bin/bash

# Define source paths
ANGULAR_PATHS=(
  "./pre_loaders/angular-18/dist/onecx-angular-18-loader"
  "./pre_loaders/angular-19/dist/onecx-angular-19-loader"
  "./pre_loaders/angular-20/dist/onecx-angular-20-loader"
)

# Define destination base path
SHELL_DIST_PRELOADERS_PATH="./dist/onecx-shell-ui/pre_loaders"

# Function to copy a preloader into its own content folder
copy_preloader() {
  local src="$1"
  local name
  name=$(basename "$src")
  local dest="$SHELL_DIST_PRELOADERS_PATH/$name"

  if [ -d "$src" ]; then
    mkdir -p "$dest"
    cp -r "$src/"* "$dest/"
    echo "Copied $name to $dest"
  else
    echo "Warning: Source path $src does not exist."
  fi
}

# Loop through all defined paths
for path in "${ANGULAR_PATHS[@]}"; do
  copy_preloader "$path"
done

echo "All preloaders copied to shell dist."
