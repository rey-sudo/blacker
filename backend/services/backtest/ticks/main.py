#!/usr/bin/env python3
import numpy as np
import redis
import os
import json
import threading

# =========================
# CONFIG
# =========================

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
STREAM_NAME = os.getenv("STREAM_NAME", "ticks:btcusdt")
BIN_FILE = os.getenv("BIN_FILE", "output/ticks.bin")
SPEED = float(os.getenv("SPEED", "0.1"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "1000"))

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
# REDIS + DATA
# =========================

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
mm = np.memmap(BIN_FILE, dtype=dtype, mode="r")

# =========================
# CONTROL GLOBAL
# =========================

stop_event = threading.Event()
worker_thread = None

# =========================
# STREAM WORKER (CANCELABLE)
# =========================

def stream_ticks():
    global stop_event

    pipe = r.pipeline()
    print("[STREAM] iniciado")

    for i in range(len(mm)):

        # 🔴 CHECK STOP
        if stop_event.is_set():
            print("[STREAM] detenido por comando")
            break

        tick = mm[i]

        ts    = int(tick["ts"])
        price = int(tick["price"])
        qty   = int(tick["qty"])
        side  = int(tick["side"])
        tid   = int(tick["id"])

        # -------------------------
        # CONTROL DE VELOCIDAD (MEJORADO)
        # -------------------------
        # permite cancelar durante la espera
        stop_event.wait(0.1 / SPEED)
        if stop_event.is_set():
            break

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
            maxlen=10_000_000,
            approximate=True
        )

        # -------------------------
        # BATCH FLUSH
        # -------------------------
        if i % BATCH_SIZE == 0:
            pipe.execute()

    # flush final
    try:
        pipe.execute()
    except Exception:
        pass

    print("[STREAM] finalizado")

# =========================
# COMMANDS
# =========================

def start_stream(_data=None):
    global worker_thread, stop_event

    if worker_thread and worker_thread.is_alive():
        print("[WARN] stream ya corriendo")
        return

    print("[CMD] start")

    stop_event.clear()

    worker_thread = threading.Thread(target=stream_ticks, daemon=True)
    worker_thread.start()


def stop_stream(_data=None):
    global stop_event

    print("[CMD] stop")
    stop_event.set()

# =========================
# DISPATCHER
# =========================

COMMANDS = {
    "start": start_stream,
    "stop": stop_stream,
}

def dispatch(msg):
    try:
        payload = json.loads(msg)
        cmd = payload.get("command")

        if cmd in COMMANDS:
            COMMANDS[cmd](payload.get("data"))
        else:
            print(f"[WARN] comando desconocido: {cmd}")

    except Exception as e:
        print("[ERROR]", e)

# =========================
# REDIS LISTENER
# =========================

def listen(channel="commands"):
    pubsub = r.pubsub()
    pubsub.subscribe(channel)

    print(f"[SYS] escuchando canal: {channel}")

    for msg in pubsub.listen():
        if msg["type"] == "message":
            dispatch(msg["data"])

# =========================
# MAIN
# =========================

if __name__ == "__main__":
    listen()