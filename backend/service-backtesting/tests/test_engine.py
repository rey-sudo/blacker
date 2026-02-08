import matplotlib
matplotlib.use("TkAgg")
import pandas as pd
from application.engine import BacktestEngine 
import mplfinance as mpf


PARQUET_PATH = "data/BTCUSDT-aggTrades-2026-02-07.parquet"

def plot_ohlcv(engine, timeframe: str, title: str):
    df = engine.ohlcv(timeframe)

    if df.empty:
        print(f"⚠️ {timeframe} vacío")
        return

    df_mpf = df.rename(columns={
        "open": "Open",
        "high": "High",
        "low": "Low",
        "close": "Close",
        "volume": "Volume"
    })

    # 🔥 mplfinance FIXES
    df_mpf.index = pd.to_datetime(df_mpf.index)
    df_mpf.index = df_mpf.index.tz_localize(None)


    mpf.plot(
        df_mpf,
        type="candle",
        volume=True,
        title=title,
        style="yahoo",
        show_nontrading=False,
        block=True
    )

def main():
    print("📥 Cargando ticks...")
    df_ticks = pd.read_parquet(
        PARQUET_PATH,
        columns=["timestamp", "price", "qty"]
    )
    
    df_ticks = df_ticks.sort_values("timestamp").reset_index(drop=True)
    
    print(f"✅ Ticks cargados: {len(df_ticks):,}")
    
    engine = BacktestEngine(
        ticks=df_ticks,
        timeframes=["1min"]
    )

    print(f"Cursor: {engine.cursor}Tick actual: {engine.current_tick()}")

    for _ in range(150_000):
        engine.step_forward()
    
    df = engine.ohlcv("1min")

    print("TOTAL VELAS:", len(df))
    
    plot_ohlcv(engine, "1min", "title")



if __name__ == "__main__":
    main()
