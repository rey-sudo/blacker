import { defineStore } from "pinia";

export const useWsStore = defineStore("ws", {
  state: () => ({
    socket: null as WebSocket | null,
    connected: false,
    messages: [] as any[],
  }),

  actions: {
    connect() {
      if (this.socket) return;

      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const url = `ws://localhost:3000/api/feed/get-connection`;

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {};

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(data);

          if (data.event === "backend_connected") {
            this.connected = true;
            console.log("[WS] conectado");
          }

          this.messages.push(data);
        } catch {
          this.messages.push(event.data);
        }
      };

      this.socket.onclose = () => {
        this.connected = false;
        this.socket = null;
        console.log("[WS] desconectado");
      };

      this.socket.onerror = (err) => {
        console.error("[WS] error", err);
      };
    },

    send(payload: any) {
      if (!this.socket || !this.connected) return;
      this.socket.send(JSON.stringify(payload));
    },

    disconnect() {
      this.socket?.close();
      this.socket = null;
    },
  },
});
