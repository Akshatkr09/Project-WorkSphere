import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { createOpaqueToken, hashOpaqueToken, verifyAccessToken, InvalidAccessTokenError } from "../security/crypto.js";
import { canGrantWorkspaceRole, canManageWorkspace, wouldRemoveLastActiveOwner } from "../security/organization-policy.js";

export const organizationRouter = Router();
organizationRouter.use(requireAuth);

const inviteRoles = ["ADMIN", "PROJECT_MANAGER", "MEMBER", "AUDITOR"] as const;
const roleSchema = z.enum(["OWNER", "ADMIN", "PROJECT_MANAGER", "MEMBER", "AUDITOR"]);
const statusSchema = z.enum(["ACTIVE", "SUSPENDED", "LEFT"]);

function param(req: Request, name: string): string {
  const value = (req.params as Record<string, unknown>)[name];
  if (typeof value !== "string") throw new Error(`Missing route parameter: ${name}`);
  return value;
}

organizationRouter.get("/members", async (req, res, next) => {
  try {
    if (!canManageWorkspace(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only workspace owners and admins can list all members" } });
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const where = { organizationId: req.auth!.organizationId };
    const [data, total] = await prisma.$transaction([
      prisma.membership.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, name: true, email: true } } } }),
      prisma.membership.count({ where })
    ]);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});

organizationRouter.patch("/members/:userId", async (req, res, next) => {
  try {
    if (!canManageWorkspace(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only workspace owners and admins can manage members" } });
    const input = z.object({ role: roleSchema.optional(), status: statusSchema.optional() }).refine(v => Object.keys(v).length > 0, "At least one field must change").parse(req.body);
    const userId = param(req, "userId");
    const current = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId: req.auth!.organizationId, userId } } });
    if (!current) return res.status(404).json({ error: { code: "MEMBER_NOT_FOUND", message: "Workspace member not found" } });
    if (input.role && !canGrantWorkspaceRole(req.auth!.role, input.role)) return res.status(403).json({ error: { code: "ROLE_NOT_GRANTABLE", message: "You cannot grant this workspace role" } });
    if (current.role === "OWNER" && ((input.role && input.role !== "OWNER") || (input.status && input.status !== "ACTIVE"))) {
      if (req.auth!.role !== "OWNER") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only an owner can change another owner's access" } });
      const ownerCount = await prisma.membership.count({ where: { organizationId: req.auth!.organizationId, role: "OWNER", status: "ACTIVE" } });
      if (wouldRemoveLastActiveOwner(current.role, current.status, input.role, input.status, ownerCount)) return res.status(409).json({ error: { code: "LAST_OWNER", message: "The workspace must retain at least one active owner" } });
    }
    if (current.userId === req.auth!.userId && input.status && input.status !== "ACTIVE") return res.status(409).json({ error: { code: "SELF_SUSPENSION", message: "You cannot suspend or remove your own membership here" } });
    const updated = await prisma.$transaction(async tx => {
      const member = await tx.membership.update({ where: { id: current.id }, data: input, include: { user: { select: { id: true, name: true, email: true } } } });
      if (input.status && input.status !== "ACTIVE") {
        await tx.refreshSession.updateMany({ where: { userId, organizationId: req.auth!.organizationId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.activityLog.create({ data: { organizationId: req.auth!.organizationId, actorId: req.auth!.userId, action: "organization.member_updated", entityType: "membership", entityId: current.id, changes: input, requestId: req.requestId } });
      return member;
    });
    res.json({ data: updated });
  } catch (error) { next(error); }
});

organizationRouter.get("/invitations", async (req, res, next) => {
  try {
    if (!canManageWorkspace(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only workspace owners and admins can list invitations" } });
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const where = { organizationId: req.auth!.organizationId };
    const [data, total] = await prisma.$transaction([
      prisma.invitation.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" }, select: { id: true, email: true, role: true, status: true, expiresAt: true, invitedById: true, acceptedAt: true, createdAt: true } }),
      prisma.invitation.count({ where })
    ]);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});

organizationRouter.post("/invitations", async (req, res, next) => {
  try {
    if (!canManageWorkspace(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only workspace owners and admins can invite members" } });
    const input = z.object({ email: z.string().trim().email().max(320).transform(v => v.toLowerCase()), role: z.enum(inviteRoles).default("MEMBER") }).parse(req.body);
    if (!canGrantWorkspaceRole(req.auth!.role, input.role)) return res.status(403).json({ error: { code: "ROLE_NOT_GRANTABLE", message: "You cannot invite someone with this workspace role" } });
    const existingUser = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId: req.auth!.organizationId, userId: existingUser.id } } });
      if (existingMembership?.status === "ACTIVE") return res.status(409).json({ error: { code: "ALREADY_MEMBER", message: "This user is already an active workspace member" } });
    }
    const pending = await prisma.invitation.findFirst({ where: { organizationId: req.auth!.organizationId, email: input.email, status: "PENDING", expiresAt: { gt: new Date() } } });
    if (pending) return res.status(409).json({ error: { code: "INVITATION_PENDING", message: "A pending invitation already exists for this email" } });
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.invitation.create({ data: { organizationId: req.auth!.organizationId, email: input.email, role: input.role, tokenHash: hashOpaqueToken(token), expiresAt, invitedById: req.auth!.userId } });
    await prisma.activityLog.create({ data: { organizationId: req.auth!.organizationId, actorId: req.auth!.userId, action: "organization.invitation_created", entityType: "invitation", entityId: invitation.id, changes: { email: input.email, role: input.role }, requestId: req.requestId } });
    // The raw token is returned once to the authorized inviter for handoff to a configured email-delivery integration.
    res.status(201).json({ data: { id: invitation.id, email: invitation.email, role: invitation.role, status: invitation.status, expiresAt, invitationToken: token } });
  } catch (error) { next(error); }
});

organizationRouter.delete("/invitations/:invitationId", async (req, res, next) => {
  try {
    if (!canManageWorkspace(req.auth!.role)) return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only workspace owners and admins can revoke invitations" } });
    const id = param(req, "invitationId");
    const result = await prisma.invitation.updateMany({ where: { id, organizationId: req.auth!.organizationId, status: "PENDING" }, data: { status: "REVOKED" } });
    if (!result.count) return res.status(404).json({ error: { code: "INVITATION_NOT_FOUND", message: "Pending invitation not found" } });
    await prisma.activityLog.create({ data: { organizationId: req.auth!.organizationId, actorId: req.auth!.userId, action: "organization.invitation_revoked", entityType: "invitation", entityId: id, requestId: req.requestId } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export const invitationAcceptRouter = Router();
invitationAcceptRouter.post("/accept", async (req, res, next) => {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "A valid bearer token is required" } });
    let claims: ReturnType<typeof verifyAccessToken>;
    try { claims = verifyAccessToken(header.slice(7)); }
    catch (error) {
      if (error instanceof InvalidAccessTokenError) return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Access token is invalid or expired" } });
      throw error;
    }
    const { invitationToken } = z.object({ invitationToken: z.string().min(40).max(200) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { id: true, email: true } });
    if (!user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "User account not found" } });
    const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashOpaqueToken(invitationToken) } });
    if (!invitation) return res.status(404).json({ error: { code: "INVITATION_NOT_FOUND", message: "Invitation not found" } });
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) return res.status(403).json({ error: { code: "INVITATION_EMAIL_MISMATCH", message: "Sign in with the email address this invitation was sent to" } });
    if (invitation.status !== "PENDING") return res.status(409).json({ error: { code: "INVITATION_NOT_PENDING", message: "This invitation is no longer pending" } });
    if (invitation.expiresAt <= new Date()) {
      await prisma.invitation.updateMany({ where: { id: invitation.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      return res.status(410).json({ error: { code: "INVITATION_EXPIRED", message: "This invitation has expired" } });
    }
    const accepted = await prisma.$transaction(async tx => {
      const consumed = await tx.invitation.updateMany({ where: { id: invitation.id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
      if (consumed.count !== 1) return false;
      await tx.membership.upsert({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId: user.id } }, create: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role, status: "ACTIVE" }, update: { role: invitation.role, status: "ACTIVE", joinedAt: new Date() } });
      await tx.activityLog.create({ data: { organizationId: invitation.organizationId, actorId: user.id, action: "organization.invitation_accepted", entityType: "invitation", entityId: invitation.id, requestId: req.requestId } });
      return true;
    });
    if (!accepted) return res.status(409).json({ error: { code: "INVITATION_ALREADY_USED", message: "This invitation has already been used" } });
    res.json({ data: { accepted: true, organizationId: invitation.organizationId } });
  } catch (error) { next(error); }
});
