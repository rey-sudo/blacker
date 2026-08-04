export default defineWebSocketHandler({
  open(peer) {
    console.log("Client connected");
  },

  async message(peer, message) {
    console.log(message.text());
    peer.send(message.text());
  },

  close(peer) {
    console.log("Client disconnected");
  },

  error(peer, error) {
    console.error(error);
  },
});