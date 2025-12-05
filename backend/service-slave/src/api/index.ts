import axios from "axios";
import https from "https";
import http from "http";

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 5000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 5000,
});

const API = axios.create({
  baseURL: process.env.MARKET_API_URL,
  timeout: 5000,
  httpAgent,
  httpsAgent,
  maxBodyLength: 2 * 1024 * 1024,
  maxContentLength: 2 * 1024 * 1024,
  headers: {
    "User-Agent": "MarketDataClient/1.0",
    Accept: "application/json",
  },
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config;
    if (!cfg) return Promise.reject(err);

    if (cfg.method !== "get") {
      return Promise.reject(err);
    }

    cfg.__retryCount = (cfg.__retryCount || 0) + 1;

    if (cfg.__retryCount > 3) {
      return Promise.reject(err);
    }

    if (err.response?.status === 429) {
      const retryAfter = Number(err.response.headers["retry-after"] || 1);
      await new Promise((res) => setTimeout(res, retryAfter * 1000));
      return API(cfg);
    }

    const delay = 200 * Math.pow(2, cfg.__retryCount);
    await new Promise((res) => setTimeout(res, delay));

    return API(cfg);
  }
);

export default API;
