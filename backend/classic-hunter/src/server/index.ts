import path from 'path';
import express from 'express';
import serveIndex from 'serve-index';
import { HunterBot, root } from '../index.js';

export function startHttpServer(bot: HunterBot) {

  const app = express();

  app.use(express.json());

  app.get(`/api/hunter/get-hunter`, (req, res) => {
    res.json(bot.state);
  });

  const outputPath = path.join(root, 'output');
  app.use(`/api/hunter/output`, express.static(outputPath), serveIndex(outputPath, { icons: true }));

  app.get(`/api/hunter/ping`, (req, res) => {
    res.status(200).send('Test OK');
  });

  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  app.listen(3001, () => {
    console.log('📡 Server listening port 3001');
  });
}