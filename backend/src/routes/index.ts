import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { projectsRouter } from "./projects.routes.js";
import { tasksRouter } from "./tasks.routes.js";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/tasks", tasksRouter);
