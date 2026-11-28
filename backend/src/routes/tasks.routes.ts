import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { projectAccessWhere } from "../security/project-access.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const createTask = z.object({
  projectId: z.string().uuid(), title: z.string().trim().min(2).max(200),
  description: z.string().max(20000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"]).optional(),
  dueDate: z.coerce.date().optional(), milestoneId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).max(20).optional()
});
const updateTask = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(20000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"]).optional(),
  dueDate: z.coerce.date().nullable().optional(), version: z.number().int().positive()
}).refine(v => Object.keys(v).some(k => k !== "version"), "At least one field must change");

const readableTaskWhere = (req: Express.Request) => ({
  organizationId: req.auth!.organizationId, project: { is: projectAccessWhere(req.auth!, "read") }
});
const writableTaskWhere = (req: Express.Request) => ({
  organizationId: req.auth!.organizationId, project: { is: projectAccessWhere(req.auth!, "write") }
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const where = {
      ...readableTaskWhere(req),
      ...(status && ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"].includes(status)
        ? { status: status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE" } : {})
    };
    const [items, total] = await prisma.$transaction([
      prisma.task.findMany({ where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
        include: { project: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { comments: true, subtasks: true } } } }),
      prisma.task.count({ where })
    ]);
    res.json({ data: items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    const input = createTask.parse(req.body);
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ...projectAccessWhere(req.auth!, "write") }, select: { id: true }
    });
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot add tasks" } });
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findFirst({ where: { id: input.milestoneId, projectId: input.projectId }, select: { id: true } });
      if (!milestone) return res.status(422).json({ error: { code: "INVALID_MILESTONE", message: "Milestone must belong to the selected project" } });
    }
    const assigneeIds = [...new Set(input.assigneeIds ?? [])];
    if (assigneeIds.length) {
      const count = await prisma.membership.count({
        where: { organizationId: req.auth!.organizationId, userId: { in: assigneeIds }, status: "ACTIVE" }
      });
      if (count !== assigneeIds.length) return res.status(422).json({ error: { code: "INVALID_ASSIGNEE", message: "Every assignee must be an active workspace member" } });
    }
    const task = await prisma.$transaction(async tx => {
      const created = await tx.task.create({
        data: { organizationId: req.auth!.organizationId, projectId: input.projectId, title: input.title,
          description: input.description, priority: input.priority, status: input.status, dueDate: input.dueDate,
          milestoneId: input.milestoneId, assignees: { create: assigneeIds.map(userId => ({ userId })) } },
        include: { assignees: true }
      });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, projectId: input.projectId,
        taskId: created.id, actorId: req.auth!.userId, action: "task.created", entityType: "task",
        entityId: created.id, requestId: req.requestId } });
      return created;
    });
    res.status(201).json({ data: task });
  } catch (error) { next(error); }
});

tasksRouter.patch("/:taskId", async (req, res, next) => {
  try {
    const input = updateTask.parse(req.body);
    const existing = await prisma.task.findFirst({
      where: { id: req.params.taskId, ...writableTaskWhere(req) },
      select: { id: true, projectId: true, version: true, title: true, status: true, priority: true }
    });
    if (!existing) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found or you cannot modify it" } });
    const result = await prisma.$transaction(async tx => {
      const changed = await tx.task.updateMany({
        where: { id: existing.id, organizationId: req.auth!.organizationId, version: input.version,
          project: { is: projectAccessWhere(req.auth!, "write") } },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
          version: { increment: 1 }
        }
      });
      if (changed.count !== 1) return null;
      const updated = await tx.task.findFirst({ where: { id: existing.id, organizationId: req.auth!.organizationId } });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId,
        projectId: existing.projectId, taskId: existing.id, actorId: req.auth!.userId,
        action: "task.updated", entityType: "task", entityId: existing.id,
        changes: { before: { title: existing.title, status: existing.status, priority: existing.priority }, after: input },
        requestId: req.requestId } });
      return updated;
    });
    if (!result) return res.status(409).json({ error: { code: "VERSION_CONFLICT", message: "Task changed or access changed. Refresh and retry." } });
    res.json({ data: result });
  } catch (error) { next(error); }
});

tasksRouter.post("/:taskId/comments", async (req, res, next) => {
  try {
    const input = z.object({ body: z.string().trim().min(1).max(10000) }).parse(req.body);
    const task = await prisma.task.findFirst({ where: { id: req.params.taskId, ...writableTaskWhere(req) }, select: { id: true } });
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found or you cannot comment" } });
    const comment = await prisma.$transaction(async tx => {
      const created = await tx.comment.create({ data: { organizationId: req.auth!.organizationId,
        taskId: task.id, authorId: req.auth!.userId, body: input.body },
        include: { author: { select: { id: true, name: true } } } });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, taskId: task.id,
        actorId: req.auth!.userId, action: "task.comment_added", entityType: "comment",
        entityId: created.id, requestId: req.requestId } });
      return created;
    });
    res.status(201).json({ data: comment });
  } catch (error) { next(error); }
});

tasksRouter.get("/:taskId/activity", async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.taskId, ...readableTaskWhere(req) }, select: { id: true } });
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } });
    const entries = await prisma.activityLog.findMany({ where: { organizationId: req.auth!.organizationId, taskId: task.id },
      orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { id: true, name: true } } } });
    res.json({ data: entries });
  } catch (error) { next(error); }
});
