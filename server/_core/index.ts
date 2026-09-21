import "dotenv/config";
import { createServer } from "http";
import app from "../app";
import { setupVite } from "./vite";

const port = Number(process.env.PORT ?? 3000);
const server = createServer(app);

async function start() {
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  server.listen(port, () => console.log(`TaxAce Dashboard API running on http://localhost:${port}`));
}

start().catch(console.error);
