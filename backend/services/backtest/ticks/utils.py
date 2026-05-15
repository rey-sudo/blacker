import csv
import sys
from collections import defaultdict
from pathlib import Path


def group_trades(input_path: str, output_path: str = None):
    """
    Lee un CSV de trades, agrupa por timestamp único y guarda ordenado.

    Columnas esperadas:
        trade_id, price, qty, quote_qty, timestamp, is_buyer_maker
    """
    input_file = Path(input_path)
    if not input_file.exists():
        print(f"[ERROR] Archivo no encontrado: {input_path}")
        sys.exit(1)

    if output_path is None:
        output_path = input_file.stem + "_grouped.csv"

    # ── Leer trades ──────────────────────────────────────────────────────────
    columns = ["trade_id", "price", "qty", "quote_qty",
               "timestamp", "is_buyer_maker"]

    trades = []
    with open(input_file, newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            # Soporte para archivos con o sin cabecera
            if row[0].strip().lower() in ("trade_id", "id"):
                continue
            trades.append(dict(zip(columns, row)))

    print(f"[INFO] Trades leídos       : {len(trades)}")

    # ── Agrupar por timestamp ─────────────────────────────────────────────────
    groups: dict[str, list[dict]] = defaultdict(list)
    for t in trades:
        groups[t["timestamp"].strip()].append(t)

    unique_ts = len(groups)
    repeated  = sum(1 for v in groups.values() if len(v) > 1)
    print(f"[INFO] Timestamps únicos   : {unique_ts}")
    print(f"[INFO] Timestamps repetidos: {repeated}")

    # ── Construir filas agrupadas ─────────────────────────────────────────────
    # Por cada timestamp: suma qty y quote_qty, promedio ponderado de price,
    # conserva el primer trade_id del grupo, y las flags del primer trade.
    output_rows = []
    for ts, group in groups.items():
        total_qty       = sum(float(t["qty"])       for t in group)
        total_quote_qty = sum(float(t["quote_qty"]) for t in group)

        # Precio promedio ponderado  (∑ price*qty / ∑ qty)
        vwap = sum(float(t["price"]) * float(t["qty"]) for t in group) / total_qty

        output_rows.append({
            "trade_id"       : group[0]["trade_id"].strip(),
            "price"          : f"{vwap:.8f}",
            "qty"            : f"{total_qty:.8f}",
            "quote_qty"      : f"{total_quote_qty:.8f}",
            "timestamp"      : ts,
            "is_buyer_maker" : group[0]["is_buyer_maker"].strip(),
            #"is_best_match"  : group[0]["is_best_match"].strip(),
            #"trades_merged"  : len(group),        # columna extra para trazabilidad
        })

    # ── Ordenar por timestamp ─────────────────────────────────────────────────
    output_rows.sort(key=lambda r: int(r["timestamp"]))

    # ── Escribir CSV de salida ────────────────────────────────────────────────
    out_cols = ["trade_id", "price", "qty", "quote_qty",
                "timestamp", "is_buyer_maker"]

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=out_cols)
        writer.writerows(output_rows)

    print(f"[INFO] CSV generado        : {output_path}")
    print(f"[INFO] Filas en salida     : {len(output_rows)}")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python group_trades.py <input.csv> [output.csv]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    group_trades(inp, out)