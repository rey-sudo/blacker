#!/bin/bash

source venv/bin/activate

# Function to stop both processes on Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $PID_MAIN $PID_CHART
    exit
}

# Trap the interrupt signal
trap cleanup SIGINT

echo "🚀 Starting"

# 1. Start Backend
python3 main.py &
PID_MAIN=$!

# 2. Start Frontend
python3 chart.py &
PID_CHART=$!

echo "------------------------------------------------"
echo "✅ Both servers are running."
echo "   - Backend PID: $PID_MAIN (Port 8765)"
echo "   - Frontend PID: $PID_CHART (Port 8007)"
echo "Press Ctrl+C to stop both."
echo "------------------------------------------------"

wait