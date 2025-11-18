import { defineEventHandler, getQuery, createError } from "h3";

export default defineEventHandler(async (event) => {
  const { symbol, source, interval, exchange } = getQuery(event);

  try {
    console.log(symbol, source, interval, exchange);

    const apiUrl = "http://localhost:8001/api/market/get-candle";
    const res = await $fetch(apiUrl, {
      method: "GET",
      params: { symbol, source, interval, exchange },
    });
    return res;
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});
