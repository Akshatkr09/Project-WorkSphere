import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  hashPassword, issueAccessToken, verifyPassword,
  createOpaqueToken, hashOpaqueToken
} from "../security/crypto.js";

export const authRouter = Router();

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform(v => v.toLowerCase()),
  password: z.string().min(10).max(128),
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80)
});
const loginSchema = z.object({
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  password: z.string().min(1).max(128),
  organizationSlug: z.string().trim().toLowerCase().min(2).max(80)
});
const refreshSchema = z.object({ refreshToken: z.string().min(40).max(200) });

async function issueSession(userId: string, organizationId: string, familyId = randomUUID()) {
  const refreshToken = createOpaqueToken();
  await prisma.refreshSession.create({
    data: {
      userId, organizationId, familyId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS)
    }
  });
  return refreshToken;
}

function authResponse(user: {id:string;name:string;email:string}, organization: {id:string;name:string;slug:string}, role: string, refreshToken: string) {
  return {
    accessToken: issueAccessToken(user.id, organization.id, role),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: 900,
    refreshExpiresIn: Math.floor(REFRESH_TTL_MS / 1000),
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: organization.id, name: organization.name, slug: organization.slug }
  };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(input.password);
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash } });
      const organization = await tx.organization.create({ data: { name: input.organizationName, slug: input.organizationSlug } });
      const membership = await tx.membership.create({
        data: { organizationId: organization.id, userId: user.id, role: "OWNER" }
      });
      return { user, organization, membership };
    });
    const refreshToken = await issueSession(result.user.id, result.organization.id);
    res.status(201).json({ data: authResponse(result.user, result.organization, result.membership.role, refreshToken) });
  } catch (error) { next(error); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    }
    const organization = await prisma.organization.findUnique({ where: { slug: input.organizationSlug } });
    if (!organization) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } }
    });
    if (!membership || membership.status !== "ACTIVE") {
      return res.status(403).json({ error: { code: "MEMBERSHIP_INACTIVE", message: "You do not have active access to this workspace" } });
    }
    const refreshToken = await issueSession(user.id, organization.id);
    res.json({ data: authResponse(user, organization, membership.role, refreshToken) });
  } catch (error) { next(error); }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashOpaqueToken(refreshToken);
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true, organization: true }
    });
    if (!session) return res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid" } });

    if (session.revokedAt) {
      await prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      return res.status(401).json({ error: { code: "REFRESH_TOKEN_REUSE", message: "Refresh token reuse detected; this session family has been revoked" } });
    }
    if (session.expiresAt <= new Date()) {
      await prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      return res.status(401).json({ error: { code: "REFRESH_TOKEN_EXPIRED", message: "Refresh token has expired" } });
    }

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } }
    });
    if (!membership || membership.status !== "ACTIVE") {
      await prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      return res.status(403).json({ error: { code: "MEMBERSHIP_INACTIVE", message: "Workspace access is no longer active" } });
    }

    const nextToken = createOpaqueToken();
    const rotated = await prisma.$transaction(async tx => {
      const consumed = await tx.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date() }
      });
      if (consumed.count !== 1) return false;
      await tx.refreshSession.create({
        data: {
          userId: session.userId,
          organizationId: session.organizationId,
          familyId: session.familyId,
          tokenHash: hashOpaqueToken(nextToken),
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS)
        }
      });
      return true;
    });
    if (!rotated) return res.status(401).json({ error: { code: "REFRESH_TOKEN_REUSED", message: "Refresh token has already been used" } });

    res.json({ data: authResponse(session.user, session.organization, membership.role, nextToken) });
  } catch (error) { next(error); }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await prisma.refreshSession.updateMany({
        where: {
          tokenHash: hashOpaqueToken(parsed.data.refreshToken),
          userId: req.auth!.userId,
          organizationId: req.auth!.organizationId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
    }
    res.status(204).send();
  } catch (error) { next(error); }
});
