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

export interface BacktestSubscription {
  symbol: string;
}

export type BacktestMessageHandler = (payload: any) => void;

export class BacktestWsService {
  private ws: WebSocket | null = null;

  private listeners = new Map<string, Set<BacktestMessageHandler>>();

  connect() {
    if (this.ws) return;

    const protocol = location.protocol === "https:" ? "wss" : "ws";

    this.ws = new WebSocket(
      `${protocol}://${location.host}/api/backtest/master/ws`,
    );

    this.ws.onopen = () => {
      console.info("[BacktestWs] Connected");

      // Reenviar todas las suscripciones al reconectar
      for (const key of this.listeners.keys()) {
        const [symbol] = key.split(":");

        this.send({
          action: "subscribe",
          symbol,
        });
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      const key = this._getKey("BTCUSDT");
      const handlers = this.listeners.get(key);
      if (!handlers) return;

      handlers.forEach((handler) => handler(data));
    };

    this.ws.onclose = () => {
      console.info("[BacktestWs] Disconnected");
      this.ws = null;

      // Aquí puedes implementar reconexión automática
    };

    this.ws.onerror = (err) => {
      console.error("[BacktestWs]", err);
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  subscribe(sub: BacktestSubscription, newHandler: BacktestMessageHandler) {
    this.connect();

    const key = this._getKey(sub.symbol);

    let handlers = this.listeners.get(key);
    const firstSubscriber = !handlers;

    if (!handlers) {
      handlers = new Set();
      this.listeners.set(key, handlers);
    }

    //Add to Set reference.
    handlers.add(newHandler);

    if (firstSubscriber && this.isConnected()) {
      this.send({
        action: "subscribe",
        symbol: sub.symbol,
      });
    }
  }

  unsubscribe(sub: BacktestSubscription, handler: BacktestMessageHandler) {
    const key = this._getKey(sub.symbol);

    const handlers = this.listeners.get(key);
    if (!handlers) return;

    handlers.delete(handler);

    if (handlers.size > 0) return;

    this.listeners.delete(key);

    if (this.isConnected()) {
      this.send({
        action: "unsubscribe",
        symbol: sub.symbol,
      });
    }
  }

  send(message: unknown) {
    if (!this.isConnected()) return;

    this.ws!.send(JSON.stringify(message));
  }

  private isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private _getKey(symbol: string) {
    return `${symbol}`;
  }
}
