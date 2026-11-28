import { describe, expect, it } from "vitest";
import { canAccessProjectRole } from "./project-access.js";

describe("project access policy", () => {
  it("allows workspace administrators without project membership", () => {
    expect(canAccessProjectRole("OWNER", null, "read")).toBe(true);
    expect(canAccessProjectRole("ADMIN", null, "write")).toBe(true);
    expect(canAccessProjectRole("PROJECT_MANAGER", null, "write")).toBe(true);
  });
  it("allows viewers to read but not modify", () => {
    expect(canAccessProjectRole("MEMBER", "VIEWER", "read")).toBe(true);
    expect(canAccessProjectRole("MEMBER", "VIEWER", "write")).toBe(false);
  });
  it("allows contributors and managers to modify", () => {
    expect(canAccessProjectRole("MEMBER", "CONTRIBUTOR", "write")).toBe(true);
    expect(canAccessProjectRole("MEMBER", "MANAGER", "write")).toBe(true);
  });
  it("denies members without membership and auditors", () => {
    expect(canAccessProjectRole("MEMBER", null, "read")).toBe(false);
    expect(canAccessProjectRole("AUDITOR", "CONTRIBUTOR", "write")).toBe(false);
  });
});
