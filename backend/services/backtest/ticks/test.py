#!/usr/bin/env python3
import numpy as np
#import redis
import time

# =========================
# CONFIG
# =========================
BIN_FILE = "ticks.bin"
STREAM_NAME = "ticks:btcusdt"

REDIS_HOST = "localhost"
REDIS_PORT = 6379

BATCH_SIZE = 1000
SPEED = 1.0  # 1=real, 10=10x

NS_TO_SEC = 1e-9

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

# =========================
# INIT
# =========================
#r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
mm = np.memmap(BIN_FILE, dtype=dtype, mode="r")

# =========================
# ITERADOR → REDIS
# =========================
def stream_ticks():
    #pipe = r.pipeline()
    for i in range(len(mm)):
        tick = mm[i]

        ts    = int(tick["ts"])
        price = int(tick["price"])
        qty   = int(tick["qty"])
        side  = int(tick["side"])
        tid   = int(tick["id"])

        # -------------------------
        # CONTROL DE VELOCIDAD
        # -------------------------

        time.sleep(0.1)
            
        tick = {
            "ts": ts,
            "price": price / PRICE_SCALE,
            "qty": qty / QTY_SCALE,
            "side": side,
            "id": tid,
        }
        
        print(tick)
                    
        # -------------------------
        # PUSH A REDIS STREAM
        # -------------------------
        """ 
        pipe.xadd(
            STREAM_NAME,
            {
                "ts": ts,
                "price": price,
                "qty": qty,
                "side": side,
                "id": tid,
            },
            maxlen=10_000_000,  # evita crecimiento infinito
            approximate=True
        )
        """
        # -------------------------
        # BATCH FLUSH
        # -------------------------
        #if i % BATCH_SIZE == 0:
            #pipe.execute()

    # flush final
    #pipe.execute()


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    print(f"[i] Streaming {len(mm):,} ticks → Redis")
    stream_ticks()
    print("[✓] Done")