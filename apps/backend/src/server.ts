import { buildApp } from "./app.js";
import { config } from "./config.js";
import { initDb } from "./db.js";

async function start() {
  await initDb();
  const app = await buildApp();
  await app.indexing.bootstrap();
  await app.listen({
    host: "0.0.0.0",
    port: config.BACKEND_PORT,
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

