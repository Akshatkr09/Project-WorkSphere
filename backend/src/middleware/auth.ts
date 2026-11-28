import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { InvalidAccessTokenError, verifyAccessToken } from "../security/crypto.js";

export type AuthContext = { userId: string; organizationId: string; role: string };
declare global {
  namespace Express {
    interface Request { auth?: AuthContext; requestId?: string; }
  }
}

/** Verify identity, then load current membership so role changes take effect immediately. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "A valid bearer token is required", requestId: req.requestId } });
  }

  let claims: ReturnType<typeof verifyAccessToken>;
  try {
    claims = verifyAccessToken(header.slice(7));
  } catch (error) {
    if (error instanceof InvalidAccessTokenError) {
      return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Access token is invalid or expired", requestId: req.requestId } });
    }
    return next(error);
  }

  try {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: claims.org, userId: claims.sub } },
      select: { role: true, status: true }
    });
    if (!membership || membership.status !== "ACTIVE") {
      return res.status(403).json({ error: { code: "MEMBERSHIP_INACTIVE", message: "You do not have active access to this workspace", requestId: req.requestId } });
    }
    req.auth = { userId: claims.sub, organizationId: claims.org, role: membership.role };
    return next();
  } catch (error) { return next(error); }
}

export function allowRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action", requestId: req.requestId } });
    }
    return next();
  };
}
