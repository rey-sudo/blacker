import axios from 'axios';
import dotenv from 'dotenv';
import retry from 'async-retry';
import database from './database/client.js';
import { formatHunterStatus, formatMasterStatus, formatSlaveStatus } from './utils/format.js';
import { findAllSlaves } from './utils/findAllSlaves.js';
import { ERROR_EVENTS } from './utils/errors.js';
import { sha256sum } from './utils/hashData.js';
import { sleep } from './utils/sleep.js';
import { USDMClient } from 'binance';
import { Telegraf } from 'telegraf';
import { Readable } from 'stream';

dotenv.config();

async function main() {
  const REQUIRED_ENV_VARS = [
    "NODE_ENV",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "BINANCE_KEY",
    "BINANCE_SECRET",
    "CHANNEL_PREFIX",
    "TELEGRAM_TOKEN",
    "SLAVE_PORT",
    "HUNTER_HOST"
  ] as const;

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

  for (const event of ERROR_EVENTS) {
    process.on(event, (err) => {
      console.error(`❌ Process error [${event}]:`, err);
      process.exit(1);
    });
  }

  const SLAVE_PORT = process.env.SLAVE_PORT!;
  const CHANNEL_PREFIX = process.env.CHANNEL_PREFIX!;

  const binance = new USDMClient({
    api_key: process.env.BINANCE_KEY!,
    api_secret: process.env.BINANCE_SECRET!
  });


  let telegramBot: Telegraf;

  let slavesData: any[] = [];

  function startTelegram() {
    try {
      telegramBot = new Telegraf(process.env.TELEGRAM_TOKEN!)
      retry(() => telegramBot.launch(),
        {
          retries: 5,
          minTimeout: 1000,
          maxTimeout: 3000
        });
      console.log("✅ telegramBot launched");
    } catch (err) {
      console.error("❌ telegramBot launch error:", err);
      throw err
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function startDatabase() {
    try {
      await database.connect({
        host: process.env.DATABASE_HOST!,
        port: parseInt(process.env.DATABASE_PORT!, 10),
        user: process.env.DATABASE_USER!,
        password: process.env.DATABASE_PASSWORD!,
        database: process.env.DATABASE_NAME!
      });

      console.log("✅ Database connected");
    } catch (err) {
      console.error("❌ startDatabase error:", err);
      throw err;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function startQueryLoop() {
    while (true) {
      let connection;
      try {
        connection = await database.client.getConnection();
        slavesData = await findAllSlaves(connection);
        console.log("✅ Data updated");
      } catch (err) {
        console.error("❌ findAllSlaves fetch error:", err);
      } finally {
        connection?.release?.();
        await sleep(60_000);
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function startMasterLoop() {
    let channel;
    try {
      channel = await telegramBot.telegram.getChat(`@${CHANNEL_PREFIX}_master`);
      if (!channel) throw new Error("❌ Master channel not found");
      console.log("✅ Master loop");
    } catch (err) {
      console.error("❌ masterChannel err:", err);
      throw err
    }

    let previousHash: string | null = null;

    while (true) {
      try {
        if(!slavesData.length) return
        
        const currentHash = sha256sum(slavesData);

        if (currentHash !== previousHash) {
          await telegramBot.telegram.sendMessage(
            channel.id,
            formatMasterStatus(slavesData),
            { parse_mode: 'Markdown' }
          );
          previousHash = currentHash;
        }
      } catch (err) {
        console.error("❌ startMasterLoop error:", err);
      }

      await sleep(60_000)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function startSlavesLoop() {
    const channels: Record<string, any> = {};
    const hashes: Record<string, string> = {};

    setInterval(async () => {
      for (const slave of slavesData) {
        const slaveId = slave.id;

        try {
          const prefix = slaveId.split('-').pop();
          if (!prefix) continue;

          if (!channels[slaveId]) {
            const getChannel = await telegramBot.telegram.getChat(`@${CHANNEL_PREFIX}_slave_${prefix}`);
            if (!getChannel) throw new Error(`❌ Channel not found for ${slaveId}`);
            channels[slaveId] = getChannel;
          }

          const channelId = channels[slaveId].id;
          const currentHash = sha256sum(slave);

          if (hashes[slaveId] !== currentHash) {
            await telegramBot.telegram.sendMessage(
              channelId,
              formatSlaveStatus(slave),
              { parse_mode: 'Markdown' }
            );

            hashes[slaveId] = currentHash;

            scrapeAndSendImages(channelId, `http://service-${slaveId}:${SLAVE_PORT}/api/slave/output/`);
          }

        } catch (err) {
          console.error(`❌ startSlavesLoop error ${slaveId}:`, err);
        }
      }
    }, 300_000);

    console.log("✅ Slaves loop");
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function startHunterLoop() {
    console.log("✅ Hunter loop");

    const HUNTER_HOST = process.env.HUNTER_HOST!

    const channel = await telegramBot.telegram.getChat(`@${CHANNEL_PREFIX}_hunter`);
    if (!channel) throw new Error(`❌ Hunter channel not found`);

    let previousHash: string | null = null;

    while (true) {
      try {
        const response = await retry(() => axios.get(`${HUNTER_HOST}/api/hunter/get-hunter`), {
          retries: 2,
          minTimeout: 500,
          maxTimeout: 1500
        });

        const hunterData = response.data
        hunterData.validSymbols = hunterData.validSymbols.length

        const currentHash = sha256sum(hunterData.detectedSymbols);

        if (currentHash !== previousHash) {
          await telegramBot.telegram.sendMessage(
            channel.id,
            formatHunterStatus(hunterData),
            { parse_mode: 'Markdown' }
          );
          previousHash = currentHash;

          scrapeAndSendImages(channel.id, `${HUNTER_HOST}/api/hunter/output/`)
        }

      }
      catch (err: any) {
        console.error(err)
      }

      await sleep(60_000)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async function scrapeAndSendImages(channelId: number, baseUrl: string): Promise<void> {

    try {
      const response = await retry(() => axios.get(baseUrl), {
        retries: 2,
        minTimeout: 500,
        maxTimeout: 1500
      });

      const files = String(response.data).split(',').filter(Boolean);
      if (files.length === 0) return;

      for (const file of files) {
        try {
          const binary = await retry(() =>
            axios.get(`${baseUrl}${file}`, { responseType: 'arraybuffer' }), {
            retries: 2,
            minTimeout: 500,
            maxTimeout: 1500
          });

          const buffer = Buffer.from(binary.data);
          const stream = Readable.from(buffer);

          await telegramBot.telegram.sendPhoto(channelId, { source: stream });
        } catch (err) {
          console.error(`❌ Error sending image [${file}]:`, err);
        }
      }
    } catch (err) {
      console.error(`❌ Error scraping:`, err);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  try {
    await Promise.all([
      startTelegram(),
      startDatabase()
    ])

    await Promise.all([
      startQueryLoop(),
      startMasterLoop(),
      startSlavesLoop(),
      startHunterLoop()
    ]);
  } catch (err) {
    console.error("❌ Fatal startup error:", err);
    process.exit(1);
  }
}

main();
