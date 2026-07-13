import threading
import time
import requests

class HeartbeatTask(threading.Thread):
    def __init__(self, master_url, apply_state):
        super().__init__(daemon=True)
        self.master_url = master_url
        self.engine_id = "Engine"
        self.apply_state = apply_state

    def run(self):
        payload = {
            "id": self.engine_id,
            "status": "Ready"
        }

        while True:
            try:
                time.sleep(3)

                response = requests.post(
                    self.master_url,
                    json=payload,
                    timeout=5,
                )

                response.raise_for_status()

                data = response.json()

                self.apply_state(data)
                
            except Exception as e:
                print(f"No se pudo registrar: {e}")