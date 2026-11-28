import { MembershipRole, Prisma, ProjectRole } from "@prisma/client";
import type { AuthContext } from "../middleware/auth.js";

const workspaceWideRoles: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.PROJECT_MANAGER
];

export function projectAccessWhere(
  auth: AuthContext,
  permission: "read" | "write" = "read"
): Prisma.ProjectWhereInput {
  if (workspaceWideRoles.includes(auth.role as MembershipRole)) {
    return { organizationId: auth.organizationId };
  }

  const allowedRoles = permission === "read"
    ? [ProjectRole.MANAGER, ProjectRole.CONTRIBUTOR, ProjectRole.VIEWER]
    : auth.role === MembershipRole.AUDITOR
      ? []
      : [ProjectRole.MANAGER, ProjectRole.CONTRIBUTOR];

  return {
    organizationId: auth.organizationId,
    members: {
      some: {
        userId: auth.userId,
        role: { in: allowedRoles }
      }
    }
  };
}

/** Pure policy mirror used by unit tests and non-query authorization decisions. */
export function canAccessProjectRole(
  membershipRole: string,
  projectRole: string | null,
  permission: "read" | "write"
): boolean {
  if (["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(membershipRole)) return true;
  if (!projectRole) return false;

  if (permission === "read") {
    return ["MANAGER", "CONTRIBUTOR", "VIEWER"].includes(projectRole);
  }

  if (membershipRole === "AUDITOR") return false;
  return ["MANAGER", "CONTRIBUTOR"].includes(projectRole);
}
