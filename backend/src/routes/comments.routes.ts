import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { projectAccessWhere } from "../security/project-access.js";

export const commentsRouter = Router();
commentsRouter.use(requireAuth);
function param(req: Request, name: string): string {
  const value = (req.params as Record<string, unknown>)[name];
  if (typeof value !== "string") throw new Error(`Missing route parameter: ${name}`);
  return value;
}
const readable = (req: Request) => ({ organizationId: req.auth!.organizationId, project: { is: projectAccessWhere(req.auth!, "read") } });
const writable = (req: Request) => ({ organizationId: req.auth!.organizationId, project: { is: projectAccessWhere(req.auth!, "write") } });

commentsRouter.get("/:taskId/comments", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const task = await prisma.task.findFirst({ where: { id: taskId, ...readable(req) }, select: { id: true } });
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } });
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const where = { organizationId: req.auth!.organizationId, taskId };
    const [data, total] = await prisma.$transaction([
      prisma.comment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } }),
      prisma.comment.count({ where })
    ]);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});

commentsRouter.patch("/:taskId/comments/:commentId", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const commentId = param(req, "commentId");
    const input = z.object({ body: z.string().trim().min(1).max(10000) }).parse(req.body);
    const task = await prisma.task.findFirst({ where: { id: taskId, ...writable(req) }, select: { id: true } });
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found or you cannot edit comments" } });
    const comment = await prisma.comment.findFirst({ where: { id: commentId, taskId, organizationId: req.auth!.organizationId }, select: { id: true, authorId: true } });
    if (!comment) return res.status(404).json({ error: { code: "COMMENT_NOT_FOUND", message: "Comment not found" } });
    if (comment.authorId !== req.auth!.userId && !["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only the comment author or a workspace manager can edit this comment" } });
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.comment.update({ where: { id: comment.id }, data: { body: input.body }, include: { author: { select: { id: true, name: true } } } });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, taskId, actorId: req.auth!.userId, action: "task.comment_updated", entityType: "comment", entityId: comment.id, requestId: req.requestId } });
      return result;
    });
    res.json({ data: updated });
  } catch (error) { next(error); }
});

commentsRouter.delete("/:taskId/comments/:commentId", async (req, res, next) => {
  try {
    const taskId = param(req, "taskId");
    const commentId = param(req, "commentId");
    const task = await prisma.task.findFirst({ where: { id: taskId, ...writable(req) }, select: { id: true } });
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found or you cannot delete comments" } });
    const comment = await prisma.comment.findFirst({ where: { id: commentId, taskId, organizationId: req.auth!.organizationId }, select: { id: true, authorId: true } });
    if (!comment) return res.status(404).json({ error: { code: "COMMENT_NOT_FOUND", message: "Comment not found" } });
    if (comment.authorId !== req.auth!.userId && !["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only the comment author or a workspace manager can delete this comment" } });
    await prisma.$transaction(async tx => {
      await tx.comment.delete({ where: { id: comment.id } });
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, taskId, actorId: req.auth!.userId, action: "task.comment_deleted", entityType: "comment", entityId: comment.id, requestId: req.requestId } });
    });
    res.status(204).send();
  } catch (error) { next(error); }
});
