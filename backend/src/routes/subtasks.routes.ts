import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { projectAccessWhere } from "../security/project-access.js";

export const subtasksRouter = Router();
subtasksRouter.use(requireAuth);
function param(req: Request, name: string): string {
  const value = (req.params as Record<string, unknown>)[name];
  if (typeof value !== "string") throw new Error(`Missing route parameter: ${name}`);
  return value;
}
const readable = (req: Request) => ({ organizationId: req.auth!.organizationId, project: { is: projectAccessWhere(req.auth!, "read") } });
const writable = (req: Request) => ({ organizationId: req.auth!.organizationId, project: { is: projectAccessWhere(req.auth!, "write") } });
const createSchema = z.object({ title: z.string().trim().min(2).max(200), description: z.string().max(20000).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(), dueDate: z.coerce.date().optional(), assigneeIds: z.array(z.string().uuid()).max(20).optional() });
const updateSchema = z.object({ title: z.string().trim().min(2).max(200).optional(), description: z.string().max(20000).nullable().optional(), status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"]).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(), dueDate: z.coerce.date().nullable().optional(), version: z.number().int().positive() }).refine(v => Object.keys(v).some(k => k !== "version"), "At least one field must change");

subtasksRouter.get("/:taskId/subtasks", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const parent = await prisma.task.findFirst({ where: { id: taskId, parentTaskId: null, ...readable(req) }, select: { id: true } });
    if (!parent) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Parent task not found" } });
    const data = await prisma.task.findMany({ where: { parentTaskId: parent.id, organizationId: req.auth!.organizationId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], include: { assignees: { include: { user: { select: { id: true, name: true } } } }, _count: { select: { comments: true } } } });
    res.json({ data });
  } catch (error) { next(error); }
});

subtasksRouter.post("/:taskId/subtasks", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const input = createSchema.parse(req.body);
    const parent = await prisma.task.findFirst({ where: { id: taskId, parentTaskId: null, ...writable(req) }, select: { id: true, projectId: true } });
    if (!parent) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Parent task not found or you cannot add subtasks" } });
    const assigneeIds = [...new Set(input.assigneeIds ?? [])];
    if (assigneeIds.length) {
      const count = await prisma.membership.count({ where: { organizationId: req.auth!.organizationId, userId: { in: assigneeIds }, status: "ACTIVE" } });
      if (count !== assigneeIds.length) return res.status(422).json({ error: { code: "INVALID_ASSIGNEE", message: "Every assignee must be an active workspace member" } });
    }
    const created = await prisma.$transaction(async tx => {
      const subtask = await tx.task.create({ data: { organizationId: req.auth!.organizationId, projectId: parent.projectId, parentTaskId: parent.id, title: input.title, description: input.description, priority: input.priority, dueDate: input.dueDate, assignees: { create: assigneeIds.map(userId => ({ userId })) } }, include: { assignees: { include: { user: { select: { id: true, name: true } } } } } });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, projectId: parent.projectId, taskId: parent.id, actorId: req.auth!.userId, action: "task.subtask_created", entityType: "task", entityId: subtask.id, requestId: req.requestId } });
      return subtask;
    });
    res.status(201).json({ data: created });
  } catch (error) { next(error); }
});

subtasksRouter.patch("/:taskId/subtasks/:subtaskId", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const subtaskId = param(req, "subtaskId");
    const input = updateSchema.parse(req.body);
    const parent = await prisma.task.findFirst({ where: { id: taskId, parentTaskId: null, ...writable(req) }, select: { id: true, projectId: true } });
    if (!parent) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Parent task not found" } });
    const existing = await prisma.task.findFirst({ where: { id: subtaskId, parentTaskId: parent.id, organizationId: req.auth!.organizationId }, select: { id: true, version: true } });
    if (!existing) return res.status(404).json({ error: { code: "SUBTASK_NOT_FOUND", message: "Subtask not found" } });
    const result = await prisma.$transaction(async tx => {
      const changed = await tx.task.updateMany({ where: { id: existing.id, parentTaskId: parent.id, organizationId: req.auth!.organizationId, version: input.version }, data: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.status !== undefined ? { status: input.status } : {}), ...(input.priority !== undefined ? { priority: input.priority } : {}), ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}), version: { increment: 1 } } });
      if (changed.count !== 1) return null;
      const updated = await tx.task.findUnique({ where: { id: existing.id }, include: { assignees: { include: { user: { select: { id: true, name: true } } } } } });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, projectId: parent.projectId, taskId: parent.id, actorId: req.auth!.userId, action: "task.subtask_updated", entityType: "task", entityId: existing.id, changes: input, requestId: req.requestId } });
      return updated;
    });
    if (!result) return res.status(409).json({ error: { code: "VERSION_CONFLICT", message: "Subtask changed. Refresh and retry." } });
    res.json({ data: result });
  } catch (error) { next(error); }
});

subtasksRouter.delete("/:taskId/subtasks/:subtaskId", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const subtaskId = param(req, "subtaskId");
    const parent = await prisma.task.findFirst({ where: { id: taskId, parentTaskId: null, ...writable(req) }, select: { id: true, projectId: true } });
    if (!parent) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Parent task not found" } });
    const deleted = await prisma.$transaction(async tx => {
      const result = await tx.task.deleteMany({ where: { id: subtaskId, parentTaskId: parent.id, organizationId: req.auth!.organizationId } });
      if (!result.count) return false;
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, projectId: parent.projectId, taskId: parent.id, actorId: req.auth!.userId, action: "task.subtask_deleted", entityType: "task", entityId: subtaskId, requestId: req.requestId } });
      return true;
    });
    if (!deleted) return res.status(404).json({ error: { code: "SUBTASK_NOT_FOUND", message: "Subtask not found" } });
    res.status(204).send();
  } catch (error) { next(error); }
});
