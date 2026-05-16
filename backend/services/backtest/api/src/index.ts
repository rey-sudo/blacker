import { app } from "./server.js";

const main = async () => {
  try {
    await app.listen({
      port: 8100,
      host: "0.0.0.0",
    });

    console.log("Listen in http://localhost:8100");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

main();