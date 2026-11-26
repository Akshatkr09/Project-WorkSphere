import { app } from "./app.js";

const port = Number(process.env.APP_PORT ?? 3001);

const server = app.listen(port, () => {
  console.log(`WorkSphere API listening on http://localhost:${port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down API server...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
