const workspaceWideRoles = new Set(["OWNER", "ADMIN", "PROJECT_MANAGER"]);

/** Non-manager members must scope activity exports to a project they can read. */
export function canExportOrganizationActivity(role: string, projectId?: string): boolean {
  return workspaceWideRoles.has(role) || Boolean(projectId);
}
