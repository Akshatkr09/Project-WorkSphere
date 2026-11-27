import cors from "cors";
import express from "express";
import helmet from "helmet";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound, requestContext } from "./middleware/errors.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);

app.get("/api/v1/health", (_request, response) => {
  response.status(200).json({ status: "ok", service: "worksphere-core-api", version: "v1" });
});

app.use("/api/v1", apiRouter);
app.use(notFound);
app.use(errorHandler);

export { app };
