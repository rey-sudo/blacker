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
from ingestion.tick import Tick
from core.engine import TradingEngine
from ingestion.pulsar_consumer import PulsarConsumer
from publication.pulsar_publisher import PulsarPublisher

#-----------------------------------------------------------------------------------------------------------------------
# IMPLEMENTATION
#-----------------------------------------------------------------------------------------------------------------------

consumer = PulsarConsumer(
        service_url="pulsar://localhost:6650",
        topic="persistent://public/default/master.tick",
        subscription="engine-sub",
)

publisher = PulsarPublisher(
    service_url="pulsar://localhost:6650",
    topic="persistent://public/default/engine.state",
)

engine = TradingEngine()

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE TICKS
#-----------------------------------------------------------------------------------------------------------------------

def handle_tick(cstate: dict, tick: Tick):

    def _fetch_state():
        try:
            response = requests.get(
                "http://localhost:3002/api/backtest/master/get-state",
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting backtest state: {e}")
            return None
        except ValueError as e:
            print(f"Error parsing response JSON: {e}")
            return None

    def _sync_master_state():
        res = _fetch_state()
        if res is None:
            print("Master endpoint error.")
            return False

        engine.boot_id = res["boot_id"]
        engine.set_state(
            config_hash=res["master"]["config_hash"],
            engine_state=res["master"]["engine_state"],
            strategy=res["master"]["engine_strategy"],
        )
        engine.status = "ready"
        return True

    # ----------------------------------------------------------
    # BOOTSTRAP
    # ----------------------------------------------------------

    if engine.status == "init":
        if not _sync_master_state():
            return "NACK"
       
    if engine.status != "ready":
        print("Engine is not ready.")
        return "NACK"


    # ----------------------------------------------------------
    # OP VALIDATION
    # ----------------------------------------------------------

    is_strange = (
        engine.boot_id != tick.boot_id
        or engine.config_hash != tick.config_hash
    )

    if is_strange:
        if tick.tick_index % 1_000 == 0:
            print(
                f"Incorrect boot_id / config_hash "
                f"engine={engine.boot_id}/{engine.config_hash} "
                f"tick={tick.boot_id}/{tick.config_hash}"
            )

        engine.reset()
        return "ACK"
    
    # ----------------------------------------------------------
    # TICK SEQUENCE
    # ----------------------------------------------------------

    if engine.state.tick_index > 0:
        if tick.tick_index - 1 != engine.state.tick_index:
            print(
                f"Incorrect engine.state.tick_index={engine.state.tick_index}, "
                f"tick.tick_index={tick.tick_index}, expected={engine.state.tick_index + 1}"
            )

            return "NACK"

    # ----------------------------------------------------------
    # PROCESS
    # ----------------------------------------------------------

    new_state, signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)

    if tick.tick_index % 100_000 == 0:
        print(f"Processed: {tick.tick_index}")


    # ----------------------------------------------------------
    # LAST
    # ----------------------------------------------------------

    if cstate.get("is_last"):
        publisher.publish(new_state)

#-----------------------------------------------------------------------------------------------------------------------
# MAIN
#-----------------------------------------------------------------------------------------------------------------------

def main():
    consumer.listen(handle_tick)

main()