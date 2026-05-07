#!/bin/bash

echo "Started building preloaders (sequential)"

STATUS1=0
STATUS2=0
STATUS3=0
STATUS4=0

echo "Building Angular 18..."
(cd ./pre_loaders/angular-18 && npm run build) || STATUS1=$?

echo "Building Angular 19..."
(cd ./pre_loaders/angular-19 && npm run build) || STATUS2=$?

echo "Building Angular 20..."
(cd ./pre_loaders/angular-20 && npm run build) || STATUS3=$?

echo "Building Angular 21..."
(cd ./pre_loaders/angular-21 && npm run build) || STATUS4=$?

# Check if any build failed
if [[ $STATUS1 -ne 0 || $STATUS2 -ne 0 || $STATUS3 -ne 0 || $STATUS4 -ne 0 ]]; then
  echo "One or more builds failed."
  exit 1
else
  echo "All builds completed successfully."
fi
