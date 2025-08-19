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

AMOUNT = 500

STOP_LOSS = 0.95


um_futures_client = UMFutures()

um_futures_client = UMFutures(key=BINANCE_KEY, secret=BINANCE_TOKEN)



def configure_futures(symbol):
    try:
        um_futures_client.change_margin_type(symbol=symbol, marginType='ISOLATED')
        um_futures_client.change_leverage(symbol=symbol, leverage=5)

    except Exception:
        print(f"Error: {symbol} Already configured.")

configure_futures(SYMBOL)

def get_current_price(symbol: str):
    """Fetch current market price for a given symbol."""
    return float(um_futures_client.ticker_price(symbol)['price'])

def get_precision(symbol: str):
    """Fetch price and quantity precision for a specific futures symbol."""
    try:
        symbol_info = um_futures_client.exchange_info()
        for info in symbol_info.get('symbols', []):
            if info.get('symbol') == symbol:
                return info['pricePrecision'], info['quantityPrecision']
        raise ValueError(f"Symbol {symbol} not found!")
    except KeyError as e:
        raise RuntimeError(f"Unexpected response format: {e}")


current_price = get_current_price(SYMBOL)

price_precision, qty_precision = get_precision(SYMBOL)

stop_price = round(current_price * STOP_LOSS, price_precision)

quantity = round(AMOUNT / current_price, qty_precision)  




print(current_price)

print(quantity)

order = um_futures_client.new_order(
    symbol=SYMBOL,
    side='BUY',
    type='MARKET',
    quantity=quantity,
    priceProtect=True,
    workingType="MARK_PRICE"
)
                                               
print(order['orderId'])                                               


stop_loss_order = um_futures_client.new_order(
    symbol=SYMBOL,
    side='SELL',
    type='STOP_MARKET',
    stopPrice=stop_price,
    closePosition=True,  
    priceProtect=True
)

print(order['orderId'])


sell_orders = [
    {'price': round(current_price * 1.05, price_precision) , 'quantity': round(quantity * 0.3, qty_precision) },
    {'price': round(current_price * 1.15, price_precision), 'quantity': round(quantity * 0.4, qty_precision) },
    {'price': round(current_price * 1.30, price_precision), 'quantity': round(quantity * 0.4, qty_precision) }
]

print(sell_orders)

for i in sell_orders:

    tp_order = um_futures_client.new_order(
        symbol=SYMBOL,
        side='SELL',
        type='TAKE_PROFIT_MARKET',
        stopPrice=i['price'],  
        quantity=i['quantity'],
        priceProtect=True
    )

    print(tp_order['orderId'])