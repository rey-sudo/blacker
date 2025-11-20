import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

def heikin_ashi_bars(klines, filename="heiken.png", mark=5, show=False):
    output_folder = Path("output")
    output_folder.mkdir(parents=True, exist_ok=True)
    save_path = output_folder / filename

    # Convert Kline data to DataFrame
    columns = [
        "Open time", "Open", "High", "Low", "Close", "Volume", "Close time",
        "Quote asset volume", "Number of trades", "Taker buy base asset volume",
        "Taker buy quote asset volume", "Ignore"
    ]
    data = pd.DataFrame(klines, columns=columns)

    # Convert necessary columns to float
    data[['Open', 'High', 'Low', 'Close']] = data[['Open', 'High', 'Low', 'Close']].astype(float)

    # Compute Heikin Ashi values (Binance style, no smoothing)
    data['HA_Close'] = (data['Open'] + data['High'] + data['Low'] + data['Close']) / 4
    data['HA_Open'] = 0.0
    data.at[0, 'HA_Open'] = (data.at[0, 'Open'] + data.at[0, 'Close']) / 2  # inicialización

    for i in range(1, len(data)):
        data.at[i, 'HA_Open'] = (data.at[i-1, 'HA_Open'] + data.at[i-1, 'HA_Close']) / 2

    data['HA_High'] = data[['High', 'HA_Open', 'HA_Close']].max(axis=1)
    data['HA_Low'] = data[['Low', 'HA_Open', 'HA_Close']].min(axis=1)

    # Identificar último reversal alcista
    last_bullish_index = None
    for i in range(1, len(data)):
        if (data['HA_Close'][i] > data['HA_Open'][i] and 
            data['HA_Close'][i-1] <= data['HA_Open'][i-1]):
            last_bullish_index = i

    # Crear gráfico
    fig, ax = plt.subplots(figsize=(12, 6))
    for i in range(1, len(data)):
        color = 'red' if data['HA_Open'][i] > data['HA_Close'][i] else 'green'

        if i == last_bullish_index:
            ax.scatter(i, data['HA_High'][i], color='black', marker='^', s=200, label='Bullish Reversal')

        if i > last_bullish_index and i <= last_bullish_index + mark and i >= len(data) - (mark + 1) and color == 'green':
            color = 'blue'

        ax.plot([i, i], [data['HA_Low'][i], data['HA_High'][i]], color=color)
        ax.add_patch(
            plt.Rectangle((i - 0.3, min(data['HA_Open'][i], data['HA_Close'][i])),
                          0.6, abs(data['HA_Close'][i] - data['HA_Open'][i]),
                          facecolor=color, edgecolor=color)
        )

    plt.tight_layout()
    plt.savefig(save_path)
    if show:
        plt.show()
    plt.close()
