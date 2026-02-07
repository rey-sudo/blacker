import requests
import time
import pandas as pd
from datetime import datetime, timedelta, timezone
from tqdm import tqdm
import os

BINANCE_URL = "https://api.binance.com/api/v3/historicalTrades"

def validate_tick_parquet(path: str) -> dict:
    """
    Valida integridad básica de un parquet de ticks.

    :param path: Ruta al archivo parquet
    :return: Diccionario con métricas de integridad
    """

    df = pd.read_parquet(path)

    results = {
        "total_ticks": len(df),
        "duplicated_trade_ids": int(df["trade_id"].duplicated().sum()),
        "timestamp_ordered": bool(df["timestamp"].is_monotonic_increasing),
        "max_trade_id_gap": int(df["trade_id"].diff().max())
    }

    for k, v in results.items():
        print(f"{k}: {v}")
        
def download_ticks_to_parquet(
    symbol: str,
    years: int,
    api_key: str,
    output_dir: str = "data",
    limit: int = 1000,
    sleep_time: float = 0.5
):
    """
    Descarga ticks históricos de Binance y los guarda en Parquet.

    :param symbol: Ej. 'BTCUSDT'
    :param years: Años hacia atrás
    :param api_key: API Key de Binance
    :param output_dir: Carpeta destino
    :param limit: Máx trades por request (1000)
    :param sleep_time: Pausa entre requests
    """

    os.makedirs(output_dir, exist_ok=True)
    output_file = f"{output_dir}/{symbol}_ticks_{years}y.parquet"

    headers = {}
    
    start_time = int(
        (datetime.now(timezone.utc) - timedelta(days=365 * years)).timestamp() * 1000
    )

    all_trades = []
    from_id = None
    finished = False

    print(f"📥 Descargando ticks de {symbol} ({years} años)")

    with tqdm(desc="Ticks descargados") as pbar:
        while not finished:
            params = {"symbol": symbol, "limit": limit}
            if from_id is not None:
                params["fromId"] = from_id

            r = requests.get(BINANCE_URL, headers=headers, params=params)
            r.raise_for_status()
            trades = r.json()

            if not trades:
                break

            for t in trades:
                if t["time"] < start_time:
                    finished = True
                    break

                all_trades.append({
                    "trade_id": t["id"],
                    "price": float(t["price"]),
                    "qty": float(t["qty"]),
                    "quote_qty": float(t["quoteQty"]),
                    "timestamp": pd.to_datetime(t["time"], unit="ms"),
                    "is_buyer_maker": t["isBuyerMaker"]
                })

            from_id = trades[-1]["id"] + 1
            pbar.update(len(trades))
            time.sleep(sleep_time)

    df = pd.DataFrame(all_trades)
    df.sort_values("timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)

    df.to_parquet(output_file, engine="pyarrow", compression="snappy")

    print(f"✅ Guardado en: {output_file}")
    print(f"📊 Total ticks: {len(df):,}")
    
    validate_tick_parquet(output_file)
    


download_ticks_to_parquet(
    symbol="BTCUSDT",
    years=1,
    api_key="TU_API_KEY_BINANCE"
)


#validate_tick_parquet("data/BTCUSDT_ticks_1y.parquet")