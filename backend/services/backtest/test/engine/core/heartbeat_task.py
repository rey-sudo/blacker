# BLACKER
# Copyright (C) 2026 Juan José Caballero Rey
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

import time
import requests
from typing import Any
from core.engine import EngineState

class HeartbeatTask():
    def __init__(self, master_url:str, apply_state:Any, engine:EngineState):
        self.engine_id = "Engine"
        self.engine = engine
        self.initialized = False
        self.master_url = master_url
        self.callback = apply_state

    def start(self):
        print("Running heartbeat task.")
        
        while True:
            try:
                print(self.engine.status)
                time.sleep(1)

                payload = {
                    "id": self.engine_id,
                    "status": self.engine.status,
                    "initialized": self.initialized
                }
          
                response = requests.post(
                    self.master_url,
                    json=payload,
                    timeout=5,
                )

                response.raise_for_status()

                data = response.json()

                self.initialized = self.callback(data)

            except Exception as e:
                print(f"Heartbeat task error: {e}")
                continue