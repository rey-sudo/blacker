const BACKEND_WS_URL = "ws://localhost:3001/api/market/ws";

function getTarget(client: any): WebSocket | undefined {
  return client.context.target;
}

function closeTarget(client: any) {
  const target = getTarget(client);

  if (
    target?.readyState === WebSocket.OPEN ||
    target?.readyState === WebSocket.CONNECTING
  ) {
    target.close();
  }
}

function attachTargetListeners(client: any, target: WebSocket) {
  target.onopen = () => {
    console.log("[proxy] Backend connected");
  };

  target.onmessage = ({ data }) => {
    try {
      client.send(data);
    } catch (error) {
      console.error("[proxy] Forward failed:", error);
      target.close();
    }
  };

  target.onerror = (error) => {
    console.error("[proxy] Backend error:", error);
  };

  target.onclose = ({ code, reason, wasClean }) => {
    console.log("[proxy] Backend closed", {
      code,
      reason,
      wasClean,
    });

    try {
      client.close();
    } catch {}
  };
}

export default defineWebSocketHandler({
  open(client) {
    const target = new WebSocket(BACKEND_WS_URL);

    client.context.target = target;

    attachTargetListeners(client, target);
  },

  message(client, message) {
    const target = getTarget(client);

    if (target?.readyState === WebSocket.OPEN) {
      target.send(message.text());
    }
  },

  close(client) {
    closeTarget(client);
  },

  error(client, error) {
    console.error("[proxy] Client error:", error);
    closeTarget(client);
  },
});