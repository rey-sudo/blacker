#!/usr/bin/env python3
import numpy as np
import csv
import os

INPUT_CSV = "input/BTCUSDT-trades-2026-05-06_grouped.csv"


OUTPUT_BIN = "output/ticks.bin"
OUTPUT_IDX = "output/ticks.idx"

CHUNK_SIZE = 2_000_000
INDEX_STEP = 2_000_000

PRICE_SCALE = 100_000
QTY_SCALE   = 100_000_000 

dtype = np.dtype([
    ("ts",    "int64"),
    ("id",    "int64"),
    ("price", "int64"),
    ("qty",   "int64"),
    ("side",  "int8"),
    ("pad",   "int8", 7),
])

index_dtype = np.dtype([
    ("ts",  "int64"),
    ("idx", "int64"),
])

def process_chunk(rows):
    n = len(rows)
    arr = np.empty(n, dtype=dtype)

    ts_arr    = arr["ts"]
    id_arr    = arr["id"]
    price_arr = arr["price"]
    qty_arr   = arr["qty"]
    side_arr  = arr["side"]

    for i in range(n):
        r = rows[i]

        id_arr[i] = int(r[0])
        price_arr[i] = int(float(r[1]) * PRICE_SCALE)
        qty_arr[i]   = int(float(r[2]) * QTY_SCALE)
        ts_arr[i]    = int(r[4]) * 1_000_000  # ms → ns

        # true = buyer is maker → venta agresiva
        side_arr[i] = 1 if r[5] == "true" else 0

    return arr


def main():
    os.makedirs(os.path.dirname(OUTPUT_BIN), exist_ok=True)

    if os.path.exists(OUTPUT_BIN):
        raise RuntimeError("Borra el binario existente primero")

    total = 0
    chunk = []
    index = []

    with open(INPUT_CSV, "r", buffering=1024*1024) as f, \
         open(OUTPUT_BIN, "wb") as out:

        reader = csv.reader(f)

        for row in reader:
            chunk.append(row)

            if len(chunk) >= CHUNK_SIZE:
                arr = process_chunk(chunk)
                arr.tofile(out)

                if total % INDEX_STEP == 0:
                    index.append((arr["ts"][0], total))

                total += len(arr)
                print(f"[+] {total:,} ticks")

                chunk.clear()

        if chunk:
            arr = process_chunk(chunk)
            arr.tofile(out)

            if total % INDEX_STEP == 0:
                index.append((arr["ts"][0], total))

            total += len(arr)

    print(f"[✓] Total: {total:,}")

    if index:
        np.array(index, dtype=index_dtype).tofile(OUTPUT_IDX)
        print(f"[✓] Index guardado")


if __name__ == "__main__":
    main()