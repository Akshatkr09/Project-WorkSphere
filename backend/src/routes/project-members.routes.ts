import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { projectAccessWhere } from "../security/project-access.js";

export const projectMembersRouter = Router();
projectMembersRouter.use(requireAuth);

const workspaceManagers = ["OWNER", "ADMIN", "PROJECT_MANAGER"];

async function canManageMembers(projectId: string, auth: Express.Request["auth"]) {
  if (!auth) return false;
  if (workspaceManagers.includes(auth.role)) {
    return Boolean(await prisma.project.findFirst({
      where: { id: projectId, organizationId: auth.organizationId }, select: { id: true }
    }));
  }
  return Boolean(await prisma.project.findFirst({
    where: {
      id: projectId, organizationId: auth.organizationId,
      members: { some: { userId: auth.userId, role: "MANAGER" } }
    }, select: { id: true }
  }));
}

projectMembersRouter.get("/:projectId/members", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, ...projectAccessWhere(req.auth!, "read") },
      select: { id: true }
    });
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json({ data: members });
  } catch (error) { next(error); }
});

projectMembersRouter.post("/:projectId/members", async (req, res, next) => {
  try {
    const input = z.object({
      userId: z.string().uuid(),
      role: z.enum(["MANAGER", "CONTRIBUTOR", "VIEWER"]).default("CONTRIBUTOR")
    }).parse(req.body);
    if (!await canManageMembers(req.params.projectId, req.auth)) {
      return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot manage its members" } });
    }
    const membership = await prisma.membership.findFirst({
      where: { organizationId: req.auth!.organizationId, userId: input.userId, status: "ACTIVE" },
      select: { id: true }
    });
    if (!membership) return res.status(422).json({ error: { code: "INVALID_PROJECT_MEMBER", message: "User must be an active member of this workspace" } });

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.projectId, userId: input.userId } },
      create: { projectId: req.params.projectId, userId: input.userId, role: input.role },
      update: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    await prisma.activityLog.create({
      data: { organizationId: req.auth!.organizationId, projectId: req.params.projectId, actorId: req.auth!.userId,
        action: "project.member_upserted", entityType: "project_member", entityId: member.id,
        changes: { userId: input.userId, role: input.role }, requestId: req.requestId }
    });
    res.status(200).json({ data: member });
  } catch (error) { next(error); }
});

projectMembersRouter.patch("/:projectId/members/:userId", async (req, res, next) => {
  try {
    const input = z.object({ role: z.enum(["MANAGER", "CONTRIBUTOR", "VIEWER"]) }).parse(req.body);
    if (!await canManageMembers(req.params.projectId, req.auth)) {
      return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot manage its members" } });
    }
    const result = await prisma.projectMember.updateMany({
      where: { projectId: req.params.projectId, userId: req.params.userId },
      data: { role: input.role }
    });
    if (!result.count) return res.status(404).json({ error: { code: "PROJECT_MEMBER_NOT_FOUND", message: "Project member not found" } });
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.params.userId } },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json({ data: member });
  } catch (error) { next(error); }
});

projectMembersRouter.delete("/:projectId/members/:userId", async (req, res, next) => {
  try {
    if (!await canManageMembers(req.params.projectId, req.auth)) {
      return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found or you cannot manage its members" } });
    }
    const result = await prisma.projectMember.deleteMany({
      where: { projectId: req.params.projectId, userId: req.params.userId }
    });
    if (!result.count) return res.status(404).json({ error: { code: "PROJECT_MEMBER_NOT_FOUND", message: "Project member not found" } });
    await prisma.activityLog.create({
      data: { organizationId: req.auth!.organizationId, projectId: req.params.projectId, actorId: req.auth!.userId,
        action: "project.member_removed", entityType: "project_member", entityId: req.params.userId, requestId: req.requestId }
    });
    res.status(204).send();
  } catch (error) { next(error); }
});
