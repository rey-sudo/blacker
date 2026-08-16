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
# FETCH STATE
#-----------------------------------------------------------------------------------------------------------------------

def fetch_state():
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

#-----------------------------------------------------------------------------------------------------------------------
# HANDLE TICKS
#-----------------------------------------------------------------------------------------------------------------------

def handle_tick(tick: Tick, is_last: bool):

    # ----------------------------------------------------------
    # BOOTSTRAP
    # ----------------------------------------------------------

    if engine.status == "init":

        state = fetch_state()

        if state is None:
            raise Exception("Master endpoint error.")  # NACK

        engine.boot_id = state["boot_id"]

        engine.set_state(
            config_hash=state["master"]["config_hash"],
            engine_state=state["master"]["engine_state"],
            strategy=state["master"]["engine_strategy"],
        )

        engine.status = "ready"


    # ----------------------------------------------------------
    # ENGINE READY
    # ----------------------------------------------------------

    if engine.status != "ready":
        raise Exception("Engine is not ready.")  # NACK


    # ----------------------------------------------------------
    # BOOT VALIDATION
    # ----------------------------------------------------------

    if engine.boot_id != tick.boot_id or engine.config_hash != tick.config_hash:
        print(
            f"Incorrect boot_id / config_hash reseting..."
            f"engine={engine.boot_id}/{engine.config_hash}"
            f"tick={tick.boot_id}/{tick.config_hash}"
        )

        engine.reset()
        return #ACK
        

    # ----------------------------------------------------------
    # TICK SEQUENCE
    # ----------------------------------------------------------

    if engine.state.tick_index > 0:
        if tick.tick_index - 1 != engine.state.tick_index:
            print(
                f"Incorrect engine.state.tick_index={engine.state.tick_index}, "
                f"tick.tick_index={tick.tick_index}, expected={engine.state.tick_index + 1}"
            )

            raise Exception("Incorrect tick index.")  # NACK

    # ----------------------------------------------------------
    # PROCESS
    # ----------------------------------------------------------

    state, signal = engine.on_tick(tick)

    if signal:
        print("SIGNAL:", signal)

    if tick.tick_index % 100_000 == 0:
        print(f"Processed: {tick.tick_index}")


    # ----------------------------------------------------------
    # LAST
    # ----------------------------------------------------------

    if is_last:
        publisher.publish(state)
        time.sleep(5)

#-----------------------------------------------------------------------------------------------------------------------
# MAIN
#-----------------------------------------------------------------------------------------------------------------------

def main():
    consumer.listen(handle_tick)

main()