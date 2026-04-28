#!/bin/bash

echo "Started building preloaders"

LOG18="build-angular-18.log"
LOG19="build-angular-19.log"
LOG20="build-angular-20.log"
LOG21="build-angular-21.log"

rm -f $LOG18 $LOG19 $LOG20 $LOG21

# Run builds in parallel and redirect output to log files
(cd ./pre_loaders/angular-18 && npm run build) > $LOG18 2>&1 &
PID1=$!

(cd ./pre_loaders/angular-19 && npm run build) > $LOG19 2>&1 &
PID2=$!

(cd ./pre_loaders/angular-20 && npm run build) > $LOG20 2>&1 &
PID3=$!

(cd ./pre_loaders/angular-21 && npm run build) > $LOG21 2>&1 &
PID4=$!

wait $PID1
STATUS1=$?

wait $PID2
STATUS2=$?

wait $PID3
STATUS3=$?

wait $PID4
STATUS4=$?

echo "Build Log: Angular 18"
cat $LOG18
echo

echo "Build Log: Angular 19"
cat $LOG19
echo

echo "Build Log: Angular 20"
cat $LOG20
echo

echo "Build Log: Angular 21"
cat $LOG21
echo

# Check if any build failed
if [[ $STATUS1 -ne 0 || $STATUS2 -ne 0 || $STATUS3 -ne 0 || $STATUS4 -ne 0 ]]; then
  echo "One or more builds failed."
  exit 1
else
  echo "All builds completed successfully."
fi
