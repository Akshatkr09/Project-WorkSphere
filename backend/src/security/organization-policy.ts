const managerRoles = ["OWNER", "ADMIN"] as const;

export function canManageWorkspace(role: string): boolean {
  return managerRoles.includes(role as typeof managerRoles[number]);
}

/** Workspace owners may grant ADMIN; admins may grant non-admin operational roles. OWNER is never granted through invitation/member editing. */
export function canGrantWorkspaceRole(actorRole: string, targetRole: string): boolean {
  if (targetRole === "OWNER") return false;
  if (targetRole === "ADMIN") return actorRole === "OWNER";
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

export function wouldRemoveLastActiveOwner(targetRole: string, targetStatus: string, nextRole: string | undefined, nextStatus: string | undefined, activeOwnerCount: number): boolean {
  const remainsOwner = (nextRole ?? targetRole) === "OWNER";
  const remainsActive = (nextStatus ?? targetStatus) === "ACTIVE";
  return targetRole === "OWNER" && targetStatus === "ACTIVE" && (!remainsOwner || !remainsActive) && activeOwnerCount <= 1;
}
