import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

# Simple Moving Average
def sma(data, length):
    return np.convolve(data, np.ones(length)/length, mode='valid')

# Standard Deviation
def stdev(data, length):
    return np.array([np.std(data[i-length:i]) for i in range(length, len(data) + 1)])

# True Range Calculation
def true_range(high, low, close):
    tr = np.maximum(high[1:] - low[1:], np.maximum(abs(high[1:] - close[:-1]), abs(low[1:] - close[:-1])))
    return np.insert(tr, 0, 0)  # Insert zero for first value

# Linear Regression
def linreg(data, length):
    x = np.arange(length)
    return np.array([np.polyfit(x, data[i-length:i], 1)[0] for i in range(length, len(data) + 1)])

def squeeze_momentum_indicator(klines, mark=3, filename="squeeze.png", show=True, length=20, mult=2.0, lengthKC=20, multKC=1.5, use_true_range=True ):

    output_folder = Path("output") 

    output_folder.mkdir(parents=True, exist_ok=True)
    
    save_path = output_folder / filename
    
    close = np.array([float(k[4]) for k in klines])
    high = np.array([float(k[2]) for k in klines])
    low = np.array([float(k[3]) for k in klines])
    
    # Bollinger Bands
    basis = sma(close, length)
    dev = mult * stdev(close, length)
    upperBB, lowerBB = basis + dev, basis - dev
    
    # Keltner Channels
    ma = sma(close, lengthKC)
    tr = true_range(high, low, close)
    rangema = sma(tr, lengthKC)
    upperKC, lowerKC = ma + rangema * multKC, ma - rangema * multKC
    
    # Momentum Value
    avgHighLow = (np.max(high[:lengthKC]) + np.min(low[:lengthKC])) / 2
    val = linreg(close[lengthKC-1:] - avgHighLow, lengthKC)
    
    blue_line = 0
    
    last_bars = max(0, len(val) - mark)
    
    colors = []
    
    for i in range(len(val)):
        is_green = val[i] <= 0 and (i == 0 or val[i] > val[i - 1])
        if val[i] < blue_line and i >= last_bars and is_green:
            colors.append('blue') 
        elif val[i] > 0:
            if i == 0 or val[i] > val[i-1]:
                colors.append('green')  # Increasing positive momentum
            else:
                colors.append('red')  # Decreasing positive momentum
        else:
            if i == 0 or val[i] < val[i-1]:
                colors.append('red')  # Increasing negative momentum
            else:
                colors.append('green')  # Decreasing negative momentum
    
    # Plot
    plt.figure(figsize=(12, 6))
    plt.bar(range(len(val)), val, color=colors, width=1)
    plt.axhline(0, color='black', linewidth=1)
    plt.axhline(blue_line, color='black', linewidth=2)  # Halfway line between 0 and bottom
    
    plt.tight_layout()
    plt.savefig(save_path)
    
    if show == True:
       plt.show() 
    
    plt.close() 