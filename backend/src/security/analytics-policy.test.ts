import { describe, expect, it } from "vitest";
import { canExportOrganizationActivity } from "./analytics-policy.js";

describe("analytics export scope policy", () => {
  it("allows workspace-wide roles to export organization activity", () => {
    for (const role of ["OWNER", "ADMIN", "PROJECT_MANAGER"]) {
      expect(canExportOrganizationActivity(role)).toBe(true);
    }
  });

  it("requires a project scope for regular members and auditors", () => {
    for (const role of ["MEMBER", "AUDITOR"]) {
      expect(canExportOrganizationActivity(role)).toBe(false);
      expect(canExportOrganizationActivity(role, "a-project-id")).toBe(true);
    }
  });
});
