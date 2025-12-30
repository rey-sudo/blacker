python3 -m venv nautilus-env
source nautilus-env/bin/activate

pip install --upgrade pip
pip install -U nautilus_trader

python -c "import nautilus_trader; print(nautilus_trader.__version__)"

python - <<EOF
from nautilus_trader.model.data import Bar
print("NautilusTrader working")
EOF
