import time
import datetime
import winsound
import random
import logging
import os
import sys
from execute import abrir_orden_market


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    handlers=[
        logging.FileHandler("log.txt"),
        logging.StreamHandler(sys.stdout)
    ]
)

sound1 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iteration.wav")
sound2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "execute.wav")

contador = 0

while True:
    contador += 1
    logging.info(f"Iteración {contador}")

    winsound.PlaySound(sound1, winsound.SND_FILENAME)
    winsound.PlaySound(sound2, winsound.SND_FILENAME)
    winsound.PlaySound(sound2, winsound.SND_FILENAME)

    """
    resp = abrir_orden_market(
        symbol="BTCUSD",
        volumen=0.01,
        sl=93000.932238,
        tp=95000.3238237,
        tipo="BUY"
    )

    print(resp)
    """
   

    if contador % 10 == 0:
        logging.info("💥 Simulando crash...")
        raise Exception("Crash intencional para prueba")

    time.sleep(3)
