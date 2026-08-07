// BLACKER
// Copyright (C) 2026 Juan José Caballero Rey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { useBacktestingTabStore } from "~/stores/tabs";

export interface BacktestWsMessage {
  status: string;
  replay_status: string;
  replay_step: string;
  slaves: Record<string, ConnectedSlave>;
  tick_index: number;
  engine_state: EngineState;
}

export interface ConnectedSlave {
  id: string;
  connected: boolean;
  status: string;
}

export interface EngineState {
  tick_index: number;
  time: number;
  timeframes: Record<string, Timeframe>;
}

export interface Timeframe {
  name: string;
  series: Record<string, unknown>;
  timeframe_ms: number
}

export function useBacktestingSession(tabId: string, symbol: string) {
  const { $backtestWs } = useNuxtApp();

  const tabManager = useTabManager();
  const tab = tabManager.getTabById(tabId)!;
  const tabStore = useBacktestingTabStore(tab as BacktestingTab);

  const onMessage = (payload: BacktestWsMessage) => {
    tabStore.updateSession(payload);
  };

  const sub = () => {
    $backtestWs.subscribe(
      {
        symbol,
      },
      onMessage,
    );
  };

  const unsub = () => {
    $backtestWs.unsubscribe(
      {
        symbol,
      },
      onMessage,
    );
  };

  onMounted(() => {
    sub();
  });

  onUnmounted(() => {
    unsub();
  });

  return {
    sub,
    unsub,
    send(command: unknown) {
      $backtestWs.send(command);
    },
  };
}
