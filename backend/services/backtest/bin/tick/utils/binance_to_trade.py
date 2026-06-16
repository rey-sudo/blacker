import pandas as pd
import sys

def normalize_timestamp(ts):
    ts = int(ts)

    # 16+ dígitos -> microsegs
    if len(str(ts)) >= 16:
        return ts // 1000

    return ts

def main(input_csv, output_csv):
    df = pd.read_csv(
        input_csv,
        header=None,
        names=[
            "tradeId",
            "price",
            "quantity",
            "quoteQty",
            "timestamp",
            "isBuyerMaker",
            "isBestMatch"
        ],
        dtype={
            "tradeId": "int64",
            "price": str,
            "quantity": str,
            "quoteQty": str,
            "timestamp": "int64",
            "isBuyerMaker": str,
            "isBestMatch": str
        }
    )

    # Ordenar por tradeId
    df = df.sort_values("tradeId")

    # Convertir microsegundos -> milisegundos
    df["timestamp"] = df["timestamp"].apply(normalize_timestamp)

    # Binance:
    # isBuyerMaker=True  -> SELL
    # isBuyerMaker=False -> BUY
    df["side"] = df["isBuyerMaker"].str.lower().map(
        {"true": "SELL", "false": "BUY"}
    )

    output_df = df[
        ["tradeId", "timestamp", "price", "quantity", "side"]
    ]

    output_df.to_csv(
        output_csv,
        index=False,
        header=False
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python convert.py input.csv output.csv")
        sys.exit(1)

    main(sys.argv[1], sys.argv[2])