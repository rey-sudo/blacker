import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

def average_directional_index(klines, adxlen=14, dilen=14, filename="adx.png", key_level=23, mark=4, show=False):
    """
    Calculates the ADX and plots it with a Key Level and marks the latest trend reversal.
    """

    output_folder = Path("output") 
    
    output_folder.mkdir(parents=True, exist_ok=True)

    save_path = output_folder / filename    
    
    if not isinstance(klines, (list, np.ndarray)) or len(klines) == 0:
        raise ValueError("Invalid klines format")

    def rma(series, length):
        return series.ewm(alpha=1/length, adjust=False).mean()
    
    df = pd.DataFrame(klines, columns=[
        'Open time', 'Open', 'High', 'Low', 'Close', 'Volume', 'Close time',
        'Quote asset volume', 'Number of trades', 'Taker buy base asset volume',
        'Taker buy quote asset volume', 'Ignore'
    ])
    df['High'] = df['High'].astype(float)
    df['Low'] = df['Low'].astype(float)
    
    def dirmov(high, low, length):
        up = high.diff()
        down = -low.diff()
        truerange = rma(high.combine(low, max) - low.combine(high, min), length)
        plus = np.where((up > down) & (up > 0), up, 0)
        minus = np.where((down > up) & (down > 0), down, 0)
        plus = 100 * rma(pd.Series(plus), length) / truerange
        minus = 100 * rma(pd.Series(minus), length) / truerange
        return plus, minus
    
    def adx(high, low, dilen, adxlen):
        plus, minus = dirmov(high, low, dilen)
        sum_ = plus + minus
        adx = 100 * rma(abs(plus - minus) / np.where(sum_ == 0, 1, sum_), adxlen)
        return adx, plus, minus
    
    sig, up, down = adx(df['High'], df['Low'], dilen, adxlen)
    
    df['ADX'] = sig
    df['+DI'] = up
    df['-DI'] = down
    df['Key Level'] = key_level
    
    plt.figure(figsize=(12, 6))
    
    latest_trend_reversal = None
    
    # ADX Plot - Green when ascending, Red when descending
    for i in range(1, len(df)):
        color = 'green' if df['ADX'].iloc[i] > df['ADX'].iloc[i-1] else 'red'
        plt.plot(df['Open time'].iloc[i-1:i+1], df['ADX'].iloc[i-1:i+1], color=color, linewidth=3)
        
        
        rule1= df['ADX'].iloc[i] < df['ADX'].iloc[i-1]
        rule2= df['ADX'].iloc[i-1] > df['ADX'].iloc[i-2]
        rule3= df['ADX'].iloc[i-1] > key_level
        
        # Track the latest trend reversal above key_level
        if rule1 and rule2 and rule3:
            latest_trend_reversal = i
    
    # Plot the latest trend reversal
    if latest_trend_reversal is not None:
        
        last_values = df['ADX'].iloc[latest_trend_reversal:] 
        
        last_values_end = len(last_values) - 1
    
        last_values_descending = all(last_values.iloc[i] > last_values.iloc[i + 1] for i in range(last_values_end))
        
        rule1 = last_values_descending
        
        rule2 = last_values.iloc[-1] > key_level
        
        rule3 = len(last_values) <= mark 
        
        if rule1 and rule2 and rule3:
            plt.scatter(df['Open time'].iloc[latest_trend_reversal], df['ADX'].iloc[latest_trend_reversal], color='blue', s=100, zorder=3)
    
    # Plot DI lines with transparent color
    #plt.plot(df['Open time'], df['+DI'], label='+DI', color=(0,0,0,0))
    #plt.plot(df['Open time'], df['-DI'], label='-DI', color=(0,0,0,0))
    
    # Key Level Line
    plt.axhline(y=key_level, color='black', linestyle='solid', label='Key Level', linewidth=2)
    
    plt.tight_layout()
    plt.savefig(save_path)
    
    if show:
        plt.show()
    
    plt.close()
