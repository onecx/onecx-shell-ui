#!/bin/bash

echo "Started building preloaders"

LOG_ANGULAR_18="build-angular-18.log"
LOG_ANGULAR_19="build-angular-19.log"
LOG_ANGULAR_20="build-angular-20.log"
LOG_ANGULAR_21="build-angular-21.log"
LOG_REACT_19="build-react-19.log"

rm -f $LOG_ANGULAR_18 $LOG_ANGULAR_19 $LOG_ANGULAR_20 $LOG_ANGULAR_21 $LOG_REACT_19

# Run builds in parallel and redirect output to log files
(cd ./pre_loaders/angular-18 && npm run build) > $LOG_ANGULAR_18 2>&1 &
PID1=$!

(cd ./pre_loaders/angular-19 && npm run build) > $LOG_ANGULAR_19 2>&1 &
PID2=$!

(cd ./pre_loaders/angular-20 && npm run build) > $LOG_ANGULAR_20 2>&1 &
PID3=$!

(cd ./pre_loaders/angular-21 && npm run build) > $LOG_ANGULAR_21 2>&1 &
PID4=$!

(cd ./pre_loaders/react-19 && npm run build) > $LOG_REACT_19 2>&1 &
PID5=$!

wait $PID1
STATUS1=$?

wait $PID2
STATUS2=$?

wait $PID3
STATUS3=$?

wait $PID4
STATUS4=$?

wait $PID5
STATUS5=$?

echo "Build Log: Angular 18"
cat $LOG_ANGULAR_18
echo

echo "Build Log: Angular 19"
cat $LOG_ANGULAR_19
echo

echo "Build Log: Angular 20"
cat $LOG_ANGULAR_20
echo

echo "Build Log: Angular 21"
cat $LOG_ANGULAR_21
echo

echo "Build Log: React 19"
cat $LOG_REACT_19
echo

# Check if any build failed
if [[ $STATUS1 -ne 0 || $STATUS2 -ne 0 || $STATUS3 -ne 0 || $STATUS4 -ne 0 || $STATUS5 -ne 0 ]]; then
  echo "One or more builds failed."
  exit 1
else
  echo "All builds completed successfully."
fi
