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

import { decode } from "@msgpack/msgpack";

export interface MarketSubscription {
  source: string;
  symbol: string;
  timeframe: string;
  series: string[];
}

export type MarketMessageHandler = (payload: any) => void;

export class MarketWsService {
  private ws: WebSocket | null = null;

  private listeners = new Map<string, Set<MarketMessageHandler>>();

  connect() {
    if (this.ws) return;

    const protocol = location.protocol === "https:" ? "wss" : "ws";

    this.ws = new WebSocket(`${protocol}://${location.host}/api/market/ws`);

    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.info("[MarketWS] Connected");

      // Reenviar todas las suscripciones al reconectar
      for (const key of this.listeners.keys()) {
        const [source, symbol] = key.split(":");

        this.send({
          action: "subscribe",
          source,
          symbol,
        });
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data);
        const payload: any = decode(bytes);

        const key = this.getKey(payload.source, payload.symbol);
        const handlers = this.listeners.get(key);
        if (!handlers) return;

        handlers.forEach((handler) => handler(payload));
      }
    };

    this.ws.onclose = () => {
      console.info("[MarketWS] Disconnected");
      this.ws = null;

      // Aquí puedes implementar reconexión automática
    };

    this.ws.onerror = (err) => {
      console.error("[MarketWS]", err);
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  subscribe(
    subscription: MarketSubscription,
    newHandler: MarketMessageHandler,
  ) {
    this.connect();

    const key = this.getKey(subscription.source, subscription.symbol);

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
        source: subscription.source,
        symbol: subscription.symbol,
      });
    }
  }

  unsubscribe(subscription: MarketSubscription, handler: MarketMessageHandler) {
    const key = this.getKey(subscription.source, subscription.symbol);

    const handlers = this.listeners.get(key);
    if (!handlers) return;

    handlers.delete(handler);

    if (handlers.size > 0) return;

    this.listeners.delete(key);

    if (this.isConnected()) {
      this.send({
        action: "unsubscribe",
        source: subscription.source,
        symbol: subscription.symbol,
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

  private getKey(source: string, symbol: string) {
    return `${source}:${symbol}`;
  }
}
