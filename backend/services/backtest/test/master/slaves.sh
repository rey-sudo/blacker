#!/bin/bash

while true; do
  curl -X POST "http://localhost:3000/master/report-state" \
    -H "Content-Type: application/json" \
    -d '{
      "id": "Execution",
      "status": "Ready",
      "version": 10
    }'

  curl -X POST "http://localhost:3000/master/report-state" \
    -H "Content-Type: application/json" \
    -d '{
      "id": "Engine",
      "status": "Ready",
      "version": 10
    }'
  sleep 1
done