import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async (event) => {
  const { id } = event.context.params || {};

  try {
    console.log(id);

    const apiUrl = `http://localhost:8082/api/slave/${id}/get-candles`;
    const res = await $fetch(apiUrl, {
      method: "GET",
    });
    return res;
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});
