// marketDataClient.js
import axios from "axios";
import https from "https";
import http from "http";


const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 30000,
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 30000,
});

const API = axios.create({
  baseURL: process.env.MARKET_API_URL,
  timeout: 5000, 
  maxBodyLength: 2 * 1024 * 1024,
  maxContentLength: 2 * 1024 * 1024,
  headers: {
    "User-Agent": "MarketDataPoller/1.0",
    Accept: "application/json",
  },
  httpAgent,
  httpsAgent,
});


API.interceptors.response.use(
  res => res,
  async err => {
    const cfg = err.config;
    if (!cfg) return Promise.reject(err);

    cfg.__retryCount = (cfg.__retryCount || 0) + 1;
    if (cfg.__retryCount > 2) {
      return Promise.reject(err);
    }

    // Backoff
    const delay = 300 * Math.pow(2, cfg.__retryCount);
    await new Promise(res => setTimeout(res, delay));

    return API(cfg);
  }
);

export default API;
