#!/usr/bin/env bash

#chmod +x setup.sh

set -euo pipefail

echo "🐍 Creating / using virtual environment..."

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "⬆️  Upgrading pip..."
pip install --upgrade pip setuptools wheel

echo "📦 Installing requirements.txt..."
pip install -r requirements.txt

echo "✅ Done. Environment ready."
