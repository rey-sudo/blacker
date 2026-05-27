export default defineWebSocketHandler({
  async open(client) {
    const target = new WebSocket("ws://localhost:8100/backtest");

    target.onopen = () => {
      console.log("[target connected]");
    };

    target.onmessage = (event) => {
      client.send(event.data);
    };

    target.onclose = () => {
      client.close();
    };

    client.context.target = target;
  },

  message(client, message) {
    const target = client.context.target as WebSocket;

    if (target?.readyState === WebSocket.OPEN) {
      target.send(message.text());
    }
  },

  close(client) {
    const target = client.context.target as WebSocket;
    target?.close();
  },
});