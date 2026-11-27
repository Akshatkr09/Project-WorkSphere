import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const createProject = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(10000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  teamId: z.string().uuid().optional()
});

projectsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const where = { organizationId: req.auth!.organizationId };
    const [items, total] = await prisma.$transaction([
      prisma.project.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { tasks: true, members: true, milestones: true } } }
      }),
      prisma.project.count({ where })
    ]);
    res.json({ data: items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});

projectsRouter.post("/", allowRoles("OWNER", "ADMIN", "PROJECT_MANAGER"), async (req, res, next) => {
  try {
    const input = createProject.parse(req.body);
    if (input.dueDate && input.startDate && input.dueDate < input.startDate) {
      return res.status(422).json({ error: { code: "INVALID_DATE_RANGE", message: "dueDate must be on or after startDate" } });
    }
    if (input.teamId) {
      const team = await prisma.team.findFirst({ where: { id: input.teamId, organizationId: req.auth!.organizationId }, select: { id: true } });
      if (!team) return res.status(404).json({ error: { code: "TEAM_NOT_FOUND", message: "Team not found in this workspace" } });
    }
    const project = await prisma.$transaction(async tx => {
      const created = await tx.project.create({
        data: {
          organizationId: req.auth!.organizationId,
          name: input.name, description: input.description,
          status: input.status, startDate: input.startDate, dueDate: input.dueDate,
          teamId: input.teamId, createdById: req.auth!.userId
        }
      });
      await tx.projectMember.create({ data: { projectId: created.id, userId: req.auth!.userId, role: "MANAGER" } });
      await tx.activityLog.create({
        data: {
          organizationId: req.auth!.organizationId, projectId: created.id,
          actorId: req.auth!.userId, action: "project.created",
          entityType: "project", entityId: created.id, requestId: req.requestId
        }
      });
      return created;
    });
    res.status(201).json({ data: project });
  } catch (error) { next(error); }
});

projectsRouter.get("/:projectId", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, organizationId: req.auth!.organizationId },
      include: { milestones: true, members: { include: { user: { select: { id: true, name: true, email: true } } } }, _count: { select: { tasks: true } } }
    });
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
    res.json({ data: project });
  } catch (error) { next(error); }
});
