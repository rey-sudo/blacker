const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

const reloadScript = `
  <script>
    const ws = new WebSocket('ws://' + window.location.host);
    ws.onmessage = () => window.location.reload();
  </script>
`;

app.get('/', (req, res) => {
    res.send(require('fs').readFileSync('index.html', 'utf8') + reloadScript);
});

server.listen(3000, () => console.log('Luchando en http://localhost:3000'));