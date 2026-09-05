#!/bin/bash

source .venv/bin/activate

while true; do
    echo "Starting main.py..."
    python3 src/main.py || echo "main.py exited with code $?"

    echo "Restarting in 3s..."
    sleep 3
done