export default defineWebSocketHandler({
  open(client) {
    console.log("[WS PROXY] cliente conectado");

    // Conexión al backend Rust (tokio-tungstenite)
    const backend = new WebSocket("ws://localhost:3030");
    backend.binaryType = "arraybuffer";

    backend.onopen = () => {
      console.log("[WS PROXY] conectado a backend (rust)");
      client.send({
        type: "system",
        event: "backend_connected",
      });
    };

    // Backend → Browser
    backend.onmessage = (event) => {
      try {
        client.send(event.data);
      } catch (err) {
        console.error("[WS PROXY] error enviando al cliente", err);
        client.close();
      }
    };

    backend.onerror = (err) => {
      console.error("[WS PROXY] error backend", err);
      client.close();
    };

    backend.onclose = () => {
      console.log("[WS PROXY] backend cerrado");
      client.close();
    };

    // Guardamos estado por conexión
    client.context.backend = backend;
  },

  message(client, message) {
    const backend = client.context.backend;
    if (!(backend instanceof WebSocket)) return;
    if (backend.readyState !== WebSocket.OPEN) return;

    const data = message?.data;
    if (!data) return;

    let text: string;

    if (typeof data === "string") {
      text = data;
    } else if (data instanceof Uint8Array) {
      text = Buffer.from(data).toString("utf8");
    } else if (data instanceof ArrayBuffer) {
      text = Buffer.from(new Uint8Array(data)).toString("utf8");
    } else {
      return;
    }

    const json = JSON.parse(text);
    console.log("[WS PROXY] JSON parseado:", json);

    backend.send(JSON.stringify(json));
  },

  close(client) {
    console.log("[WS PROXY] cliente desconectado");

    const backend = client.context.backend;
    if (backend instanceof WebSocket) {
      backend.close();
    }
  },
});
