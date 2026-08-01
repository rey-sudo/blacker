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

import { useTradingTabStore } from "~/stores/tabs/trading-tab.store";

export function useTradingSession(
  tabId: string,
  source: string,
  symbol: string,
  timeframe: string
) {
  const { $marketWs } = useNuxtApp();

  const tabManager = useTabManager();

  const tab = tabManager.getTabById(tabId)!;
  const tabStore = useTradingTabStore(tab as TradingTab);

  const onMessage = (payload: any) => {
    tabStore.updateSession(payload);
  };

  const sub = () => {
    $marketWs.subscribe(
      {
        source,
        symbol,
        timeframe
      },
      onMessage,
    );
  };

  const unsub = () => {
    $marketWs.unsubscribe(
      {
        source,
        symbol,
        timeframe
      },
      onMessage,
    );
  };

  const update = () => {
    unsub();
    sub();
  };

  onMounted(() => {
    sub();
  });

  onUnmounted(() => {
    unsub();
  });

  return {
    update,
    sub,
    unsub,
    send(command: unknown) {
      $marketWs.send(command);
    },
  };
}
