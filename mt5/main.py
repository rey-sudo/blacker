import time
import simpleaudio
import logging
import os
import sys
from execute import abrir_orden_market

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    encoding="utf-8",
    handlers=[
        logging.FileHandler("log.txt"),
        logging.StreamHandler(sys.stdout)
    ]
)

sound0 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./audio/wake.wav")
sound1 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./audio/iteration_fixed.wav")
sound2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./audio/execute_fixed.wav")


wakesound = simpleaudio.WaveObject.from_wave_file(sound0)
iterationSound = simpleaudio.WaveObject.from_wave_file(sound1)

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
