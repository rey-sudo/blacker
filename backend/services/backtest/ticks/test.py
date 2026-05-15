#!/usr/bin/env python3
import numpy as np
import redis
import time
import os

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
STREAM_NAME = os.getenv("STREAM_NAME", "ticks:btcusdt")
BIN_FILE = os.getenv("BIN_FILE", "output/ticks.bin")
SPEED = float(os.getenv("SPEED", "1.0"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "1000"))


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

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
mm = np.memmap(BIN_FILE, dtype=dtype, mode="r")


def stream_ticks():
    pipe = r.pipeline()
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
        
        pipe.xadd(
            STREAM_NAME,
            tick,
            maxlen=10_000_000,  # evita crecimiento infinito
            approximate=True
        )
  
        # -------------------------
        # BATCH FLUSH
        # -------------------------
        if i % BATCH_SIZE == 0:
            pipe.execute()

    pipe.execute()




stream_ticks()