import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, issueAccessToken, verifyPassword, createOpaqueToken, hashOpaqueToken } from "../security/crypto.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform(v => v.toLowerCase()),
  password: z.string().min(10).max(128),
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80)
});
const loginSchema = z.object({
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  password: z.string().min(1).max(128),
  organizationSlug: z.string().trim().toLowerCase().min(2).max(80)
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } });
    const passwordHash = await hashPassword(input.password);
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash } });
      const organization = await tx.organization.create({ data: { name: input.organizationName, slug: input.organizationSlug } });
      const membership = await tx.membership.create({
        data: { organizationId: organization.id, userId: user.id, role: "OWNER" }
      });
      return { user, organization, membership };
    });
    const accessToken = issueAccessToken(result.user.id, result.organization.id, result.membership.role);
    const refreshToken = createOpaqueToken();
    // Refresh-token persistence/rotation is introduced in the next auth hardening increment.
    res.status(201).json({
      data: {
        accessToken, refreshToken, tokenType: "Bearer", expiresIn: 900,
        user: { id: result.user.id, name: result.user.name, email: result.user.email },
        organization: { id: result.organization.id, name: result.organization.name, slug: result.organization.slug },
        notice: "Refresh token is currently returned for local development; do not expose this build publicly until persistent rotation is enabled."
      }
    });
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
    res.json({ data: {
      accessToken: issueAccessToken(user.id, organization.id, membership.role),
      tokenType: "Bearer", expiresIn: 900,
      user: { id: user.id, name: user.name, email: user.email },
      organization: { id: organization.id, name: organization.name, slug: organization.slug }
    } });
  } catch (error) { next(error); }
});
