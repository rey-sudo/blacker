import time
import simpleaudio
import logging
import os
import sys
from orders import process_orders
from execute import abrir_orden_market

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    encoding="utf-8",
    handlers=[
        logging.FileHandler("log.txt", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)

root=os.path.dirname(os.path.abspath(__file__))

wakesound = simpleaudio.WaveObject.from_wave_file(os.path.join(root, "./audio/wake.wav"))
iterationSound = simpleaudio.WaveObject.from_wave_file(os.path.join(root, "./audio/iteration_fixed.wav"))

contador = 0

while True:
    contador += 1
    logging.info(f"Iteración {contador}")

    wakesound.play() 
    # ------ SIMPLEAUDIO -------
    try:
        play_obj = iterationSound.play()
        play_obj.wait_done()  
    except Exception as e:
        logging.error(f"Error reproduciendo sonido: {e}")

    process_orders()

    time.sleep(60)






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