import time
import datetime
import winsound
import random
import os
from execute import abrir_orden_market

LOG_FILE = "log_servicio.txt"

sound1 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iteration.wav")
sound2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "execute.wav")

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] {msg}\n")

log("El servicio inició.")

contador = 0

while True:
    contador += 1
    log(f"Iteración {contador}")



    winsound.PlaySound(sound1, winsound.SND_FILENAME)

    winsound.PlaySound(sound2, winsound.SND_FILENAME)
    
    resp = abrir_orden_market(
        symbol="BTCUSD",
        volumen=0.01,
        sl=93000.932238,
        tp=95000.3238237,
        tipo="BUY"
    )

    print(resp)

    winsound.PlaySound(sound2, winsound.SND_FILENAME)

    # Cada 10 iteraciones simula un crash
    if contador % 10 == 0:
        log("💥 Simulando crash...")
        raise Exception("Crash intencional para prueba")

    time.sleep(3000)
