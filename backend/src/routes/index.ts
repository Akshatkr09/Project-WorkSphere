import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { projectsRouter } from "./projects.routes.js";
import { tasksRouter } from "./tasks.routes.js";
import { teamsRouter } from "./teams.routes.js";
import { milestonesRouter } from "./milestones.routes.js";
import { projectMembersRouter } from "./project-members.routes.js";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/projects", projectMembersRouter);
apiRouter.use("/projects/:projectId/milestones", milestonesRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/teams", teamsRouter);
apiRouter.use("/tasks", tasksRouter);
