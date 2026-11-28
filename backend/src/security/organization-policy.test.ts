import { describe, expect, it } from "vitest";
import { canGrantWorkspaceRole, canManageWorkspace, wouldRemoveLastActiveOwner } from "./organization-policy.js";

describe("organization role policy", () => {
  it("limits workspace administration to owners and admins", () => {
    expect(canManageWorkspace("OWNER")).toBe(true);
    expect(canManageWorkspace("ADMIN")).toBe(true);
    expect(canManageWorkspace("MEMBER")).toBe(false);
  });
  it("prevents granting owner and restricts admin grants to owners", () => {
    expect(canGrantWorkspaceRole("OWNER", "ADMIN")).toBe(true);
    expect(canGrantWorkspaceRole("ADMIN", "ADMIN")).toBe(false);
    expect(canGrantWorkspaceRole("ADMIN", "MEMBER")).toBe(true);
    expect(canGrantWorkspaceRole("OWNER", "OWNER")).toBe(false);
  });
  it("protects the last active owner", () => {
    expect(wouldRemoveLastActiveOwner("OWNER", "ACTIVE", "MEMBER", undefined, 1)).toBe(true);
    expect(wouldRemoveLastActiveOwner("OWNER", "ACTIVE", undefined, "SUSPENDED", 1)).toBe(true);
    expect(wouldRemoveLastActiveOwner("OWNER", "ACTIVE", "MEMBER", undefined, 2)).toBe(false);
    expect(wouldRemoveLastActiveOwner("ADMIN", "ACTIVE", "MEMBER", undefined, 1)).toBe(false);
  });
});
