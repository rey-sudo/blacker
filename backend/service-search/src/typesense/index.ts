import Typesense, { Client } from "typesense";
import { Env } from "../lib/env.js";

export type Instrument = {
  /** Typesense primary key */
  id: string;

  /** Internal business identifier */
  internalId: string;

  /** Trading symbol (eg BTCUSDT, AAPL) */
  symbol: string;

  description?: string;

  /** Base asset */
  base: string;

  /** Quote asset */
  quote: string;

  /** Exchange name (Binance, NASDAQ, CME, etc) */
  exchange: string;

  /** Market type (crypto, stocks, forex, futures) */
  market: string;

  /** Instrument type */
  type: "spot" | "futures" | "other";

  isin?: string;
  cusip?: string;
};

export type NewInstrument = Omit<Instrument, "id">;

export function startTypesense(env: Env) {
  return new Typesense.Client({
    nodes: [
      {
        host: env.TYPESENSE_HOST,
        port: env.TYPESENSE_PORT,
        protocol: env.TYPESENSE_PROTOCOL,
      },
    ],
    apiKey: env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 5,
  });
}

export async function verifyCollection(
  typesense: Client,
  collection: string,
  schema: any
) {
  try {
    await typesense.collections(collection).retrieve();
  } catch {
    await typesense.collections().create(schema);
  }
}

export async function upsertInstruments(
  typesense: Client,
  collection: string,
  schema: any,
  instruments: Instrument[]
) {
  await verifyCollection(typesense, collection, schema);

  const documents = instruments.map((s) => ({
    ...s,
    id: s.internalId,
  }));

  await typesense
    .collections(collection)
    .documents()
    .import(documents, { action: "upsert" });
}
