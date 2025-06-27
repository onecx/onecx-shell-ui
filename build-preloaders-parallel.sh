#!/bin/bash

echo "Started building preloaders"

# Define log files
LOG18="build-angular-18.log"
LOG19="build-angular-19.log"
LOG20="build-angular-20.log"

# Remove old logs if they exist
rm -f $LOG18 $LOG19 $LOG20

# Run builds in parallel and redirect output to log files
(cd ./pre_loaders/angular-18 && npm run build) > $LOG18 2>&1 & 
PID1=$!

(cd ./pre_loaders/angular-19 && npm run build) > $LOG19 2>&1 & 
PID2=$!

(cd ./pre_loaders/angular-20 && npm run build) > $LOG20 2>&1 & 
PID3=$!

# Wait for all builds to complete
wait $PID1
wait $PID2
wait $PID3

# Print logs sequentially
echo "Build Log: Angular 18"
cat $LOG18
echo

echo "Build Log: Angular 19"
cat $LOG19
echo

echo "Build Log: Angular 20"
cat $LOG20
echo

echo "All builds completed."
