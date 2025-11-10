import numpy as np
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
from pathlib import Path
import os

NODE_ENV = os.getenv('NODE_ENV', 'local')

if NODE_ENV == 'local':
    matplotlib.use('TkAgg')

def relative_strength_index(klines,mark=10,period=14, filename="rsi.png", show=False):
    """Calculates RSI from klines data and plots the RSI chart.
       The last 10 intervals are black if RSI is below 31.
    """
    

    output_folder = Path("output")

    output_folder.mkdir(parents=True, exist_ok=True)

    save_path = output_folder / filename
    
    # Extract closing prices from klines
    close_prices = np.array([float(candle[4]) for candle in klines])  
    
    # Compute price differences
    deltas = np.diff(close_prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = pd.Series(gains).ewm(com=(period - 1), adjust=False).mean()
    avg_loss = pd.Series(losses).ewm(com=(period - 1), adjust=False).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    # Plot RSI Chart
    plt.figure(figsize=(12, 6))
    plt.plot(rsi, label="RSI", color="gray")
    plt.axhline(70, linestyle="solid", color="red", label="Overbought (70)")
    plt.axhline(31, linestyle="solid", color="green", label="Oversold (31)")
    
    # Highlight last 10 intervals where RSI is below 31
    if len(rsi) > 10:
        last_indices = range(len(rsi) - mark, len(rsi))
        for i in last_indices:
            if rsi.iloc[i] < 31:
                plt.plot(i, rsi.iloc[i], marker="o", markersize=10, color="blue")  # Black dot
    
    plt.tight_layout()
    plt.savefig(save_path)
    
    if show == True:
       plt.show() 
    
    plt.close()

    last_rsi = rsi.iloc[-1]
    print(str(last_rsi), flush=True)

    