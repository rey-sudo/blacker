import pandas as pd
from pathlib import Path


def csv_aggtrades_to_parquet(
    csv_path: str,
    parquet_path: str | None = None,
):
    """
    Convierte un CSV histórico de aggTrades de Binance a Parquet
    y valida integridad básica.
    """

    csv_path = Path(csv_path)
    if parquet_path is None:
        parquet_path = csv_path.with_suffix(".parquet")

    # 1️⃣ Cargar CSV
    df = pd.read_csv(
        csv_path,
        header=None,
        names=[
            "agg_trade_id",
            "price",
            "qty",
            "first_trade_id",
            "last_trade_id",
            "timestamp_us",
            "is_buyer_maker",
            "is_best_match",
        ],
    )

    # 2️⃣ Tipos correctos
    df["agg_trade_id"] = df["agg_trade_id"].astype("int64")
    df["price"] = df["price"].astype("float64")
    df["qty"] = df["qty"].astype("float64")
    df["first_trade_id"] = df["first_trade_id"].astype("int64")
    df["last_trade_id"] = df["last_trade_id"].astype("int64")

    # Timestamp viene en MICROSEGUNDOS
    df["timestamp"] = pd.to_datetime(df["timestamp_us"], unit="us", utc=True)
    df.drop(columns=["timestamp_us"], inplace=True)

    df["is_buyer_maker"] = df["is_buyer_maker"].astype("bool")
    df["is_best_match"] = df["is_best_match"].astype("bool")

    # 3️⃣ Ordenar (por seguridad)
    df.sort_values("agg_trade_id", inplace=True)
    df.reset_index(drop=True, inplace=True)

    # 4️⃣ Guardar Parquet
    df.to_parquet(
        parquet_path,
        engine="pyarrow",
        compression="snappy",
    )

    print(f"✅ Parquet guardado en: {parquet_path}")

    # 5️⃣ Validación
    validate_aggtrade_parquet(df)

    return parquet_path


def validate_aggtrade_parquet(df: pd.DataFrame):
    print("\n📊 VALIDACIÓN DEL DATASET")

    print(f"Total ticks: {len(df):,}")

    dup = df["agg_trade_id"].duplicated().sum()
    print("Duplicados agg_trade_id:", dup)

    ordered_id = df["agg_trade_id"].is_monotonic_increasing
    print("IDs ordenados:", ordered_id)

    ordered_ts = df["timestamp"].is_monotonic_increasing
    print("Timestamps ordenados:", ordered_ts)

    max_gap = df["agg_trade_id"].diff().max()
    print("Máximo salto de agg_trade_id:", int(max_gap))

    print("Desde:", df["timestamp"].min())
    print("Hasta:", df["timestamp"].max())
    print("Duración:", df["timestamp"].max() - df["timestamp"].min())

    if dup == 0 and ordered_id:
        print("✅ Integridad OK")
    else:
        print("⚠️ Revisar dataset")


csv_aggtrades_to_parquet(
    "data/BTCUSDT-aggTrades-2026-02-07.csv"
)
