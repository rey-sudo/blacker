from binance.um_futures import UMFutures
from binance.error import ClientError
from dotenv import load_dotenv
import time
import os

load_dotenv()

BINANCE_KEY = os.getenv('BINANCE_KEY')

if not BINANCE_KEY:
    raise ValueError("Environment variable BINANCE_KEY is required!")

BINANCE_TOKEN = os.getenv('BINANCE_TOKEN')

if not BINANCE_TOKEN:
    raise ValueError("Environment variable BINANCE_TOKEN is required!")

SYMBOL = 'DOTUSDT'


um_futures_client = UMFutures()

um_futures_client = UMFutures(key=BINANCE_KEY, secret=BINANCE_TOKEN)

def set_error_state():
        print("errorState")
       
def note(value: str):
        print(value)      
        
def configure_margin(symbol):
    for i in range(1, 3 + 1):
        
        time.sleep(5)
        
        try:
           
            response = um_futures_client.change_margin_type(symbol=symbol, marginType='ISOLATED')
            
            if response['msg'] == 'success':
                note("MarginChanged")
                break

        except ClientError as error:
            note(f"BinanceError:{error.error_code}")
            match error.error_code:
                case -4046:
                    note("MarginChanged")
                    break

    else:
        note("ConfigureMarginError")
        set_error_state()                    
        





def configure_leverage(symbol):
    for i in range(1, 3 + 1):
        
        time.sleep(5)
         
        try:
            response = um_futures_client.change_leverage(symbol=symbol, leverage=5)
        
            if response['leverage'] == 5:
                note("LeverageChanged")
                break
        
        except ClientError as error:
            note(f"BinanceError:{error.error_code}")
               
    else:
        note("ConfigureLeverageError")
        set_error_state()            
                





