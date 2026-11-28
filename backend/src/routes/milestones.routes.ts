import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { projectAccessWhere } from "../security/project-access.js";

export const milestonesRouter = Router({ mergeParams: true });

// The parent projectId is inherited through mergeParams at runtime, but is not
// represented by the installed Express RequestParams type.
function routeParam(req: Request, name: string): string {
  const value = (req.params as Record<string, unknown>)[name];
  if (typeof value !== "string") throw new Error(`Missing route parameter: ${name}`);
  return value;
}
milestonesRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(10000).optional(),
  dueDate: z.coerce.date().optional()
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().max(10000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  completed: z.boolean().optional()
}).refine(value => Object.keys(value).length > 0, "At least one field must change");

async function findProject(projectId: string, organizationId: string, userId: string, role: string, permission: "read" | "write") {
  return prisma.project.findFirst({
    where: { id: projectId, ...projectAccessWhere({ userId, organizationId, role }, permission) },
    select: { id: true }
  });
}

milestonesRouter.get("/", async (req, res, next) => {
  try {
    const project = await findProject(routeParam(req, "projectId"), req.auth!.organizationId, req.auth!.userId, req.auth!.role, "read");
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
    const milestones = await prisma.milestone.findMany({
      where: { projectId: project.id }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { tasks: true } } }
    });
    res.json({ data: milestones });
  } catch (error) { next(error); }
});

milestonesRouter.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const project = await findProject(routeParam(req, "projectId"), req.auth!.organizationId, req.auth!.userId, req.auth!.role, "write");
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot modify it" } });
    const milestone = await prisma.$transaction(async tx => {
      const created = await tx.milestone.create({ data: { projectId: project.id, ...input } });
      await tx.activityLog.create({
        data: { organizationId: req.auth!.organizationId, projectId: project.id, actorId: req.auth!.userId,
          action: "milestone.created", entityType: "milestone", entityId: created.id, requestId: req.requestId }
      });
      return created;
    });
    res.status(201).json({ data: milestone });
  } catch (error) { next(error); }
});

milestonesRouter.patch("/:milestoneId", async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const project = await findProject(routeParam(req, "projectId"), req.auth!.organizationId, req.auth!.userId, req.auth!.role, "write");
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot modify it" } });
    const existing = await prisma.milestone.findFirst({
      where: { id: routeParam(req, "milestoneId"), projectId: project.id }, select: { id: true }
    });
    if (!existing) return res.status(404).json({ error: { code: "MILESTONE_NOT_FOUND", message: "Milestone not found" } });

    const { completed, ...fields } = input;
    const milestone = await prisma.$transaction(async tx => {
      const updated = await tx.milestone.update({
        where: { id: existing.id },
        data: {
          ...fields,
          ...(completed === undefined ? {} : { completedAt: completed ? new Date() : null })
        }
      });
      await tx.activityLog.create({
        data: { organizationId: req.auth!.organizationId, projectId: project.id, actorId: req.auth!.userId,
          action: "milestone.updated", entityType: "milestone", entityId: updated.id,
          changes: input, requestId: req.requestId }
      });
      return updated;
    });
    res.json({ data: milestone });
  } catch (error) { next(error); }
});

milestonesRouter.delete("/:milestoneId", async (req, res, next) => {
  try {
    const project = await findProject(routeParam(req, "projectId"), req.auth!.organizationId, req.auth!.userId, req.auth!.role, "write");
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot modify it" } });
    const deleted = await prisma.milestone.deleteMany({
      where: { id: routeParam(req, "milestoneId"), projectId: project.id }
    });
    if (!deleted.count) return res.status(404).json({ error: { code: "MILESTONE_NOT_FOUND", message: "Milestone not found" } });
    await prisma.activityLog.create({
      data: { organizationId: req.auth!.organizationId, projectId: project.id, actorId: req.auth!.userId,
        action: "milestone.deleted", entityType: "milestone", entityId: routeParam(req, "milestoneId"), requestId: req.requestId }
    });
    res.status(204).send();
  } catch (error) { next(error); }
});
