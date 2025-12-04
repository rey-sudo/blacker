import time
import datetime
import winsound
import random
import os

LOG_FILE = "log_servicio.txt"

ruta_wav = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sound.wav")

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] {msg}\n")

log("El servicio inició.")

contador = 0

while True:
    contador += 1
    log(f"Iteración {contador}")


    winsound.PlaySound(ruta_wav, winsound.SND_FILENAME)
    # Cada 10 iteraciones simula un crash
    if contador % 10 == 0:
        log("💥 Simulando crash...")
        raise Exception("Crash intencional para prueba")

    time.sleep(300)
