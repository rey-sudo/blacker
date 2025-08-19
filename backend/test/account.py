from binance.um_futures import UMFutures
from dotenv import load_dotenv
import os

load_dotenv()

BINANCE_KEY = os.getenv('BINANCE_KEY')

if not BINANCE_KEY:
    raise ValueError("Environment variable BINANCE_KEY is required!")

BINANCE_TOKEN = os.getenv('BINANCE_TOKEN')

if not BINANCE_TOKEN:
    raise ValueError("Environment variable BINANCE_TOKEN is required!")

SYMBOL = 'BTCUSDT'


um_futures_client = UMFutures()

um_futures_client = UMFutures(key=BINANCE_KEY, secret=BINANCE_TOKEN)



def configure_futures(symbol):
    try:
        um_futures_client.change_margin_type(symbol=symbol, marginType='ISOLATED')
        um_futures_client.change_leverage(symbol=symbol, leverage=5)

    except Exception:
        print(f"Error: {symbol} Already configured.")

configure_futures(SYMBOL)

account_info = um_futures_client.account()

print(account_info)

