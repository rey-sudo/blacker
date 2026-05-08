import { defineEventHandler, getQuery, createError } from "h3";

export default defineEventHandler(async (event) => {
  const { symbol, market, interval, window } = getQuery(event);

  try {
    console.log(symbol, market, interval, window);

    const apiUrl = "http://localhost:8001/api/market/get-candles";
    const res = await $fetch(apiUrl, {
      method: "GET",
      params: { symbol, market, interval, window },
    });
    return res;
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});
