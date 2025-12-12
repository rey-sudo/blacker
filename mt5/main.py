import time
import simpleaudio
import logging
import os
import sys
from orders import process_orders
from execute import abrir_orden_market

root=os.path.dirname(os.path.abspath(__file__))

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

wakesound = simpleaudio.WaveObject.from_wave_file(os.path.join(root, "./audio/wake_fixed.wav"))
iterationSound = simpleaudio.WaveObject.from_wave_file(os.path.join(root, "./audio/iteration_fixed.wav"))
orderSound = simpleaudio.WaveObject.from_wave_file(os.path.join(root, "./audio/buySound_fixed.wav"))


acc = 0

while True:
    try:
        acc += 1
        logging.info(f"Iteration {acc}")

        wakesound.play()
        iterationSound.play().wait_done()
        
        process_orders(orderSound)

    except Exception as e:
        logging.error(f"Error in main loop: {e}", exc_info=True)

    time.sleep(60)





