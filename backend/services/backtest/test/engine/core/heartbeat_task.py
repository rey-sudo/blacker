import time
import requests

class HeartbeatTask():
    def __init__(self, master_url, apply_state):
        self.initialized = False
        self.master_url = master_url
        self.engine_id = "Engine"
        self.callback = apply_state

    def start(self):
        print("Running heartbeat task.")
        
        while True:
            try:
                payload = {
                    "id": self.engine_id,
                    "status": "Ready",
                    "initialized": self.initialized
                }
          
                time.sleep(1)

                response = requests.post(
                    self.master_url,
                    json=payload,
                    timeout=5,
                )

                response.raise_for_status()

                data = response.json()

                self.initialized = self.callback(data)

            except Exception as e:
                print(f"No se pudo registrar: {e}")
                continue