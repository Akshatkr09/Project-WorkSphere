import { Readable } from "node:stream";
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { projectAccessWhere } from "../security/project-access.js";
import { canExportOrganizationActivity } from "../security/analytics-policy.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

const uuidSchema = z.string().uuid();
const exportQuerySchema = z.object({
  format: z.enum(["csv", "jsonl"]).default("csv"),
  projectId: z.string().uuid().optional()
});

function routeParam(req: Request, name: string): string {
  const value = (req.params as Record<string, unknown>)[name];
  if (typeof value !== "string") throw new Error(`Missing route parameter: ${name}`);
  return value;
}

async function authorizeProject(req: Request, projectIdInput: string) {
  const parsed = uuidSchema.safeParse(projectIdInput);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };
  const project = await prisma.project.findFirst({
    where: { id: parsed.data, ...projectAccessWhere(req.auth!, "read") },
    select: { id: true }
  });
  return project ? { ok: true as const, project } : { ok: false as const, error: "not_found" as const };
}

async function forwardAnalytics(req: Request, res: import("express").Response, path: string, timeoutMs = 30_000) {
  const baseUrl = (process.env.ANALYTICS_SERVICE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  const token = process.env.ANALYTICS_SERVICE_TOKEN;
  if (!token) {
    return res.status(503).json({ error: { code: "ANALYTICS_NOT_CONFIGURED", message: "Analytics service is not configured", requestId: req.requestId } });
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: { "x-analytics-service-token": token, "x-request-id": req.requestId ?? "" },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch {
    return res.status(503).json({ error: { code: "ANALYTICS_UNAVAILABLE", message: "Analytics service is temporarily unavailable", requestId: req.requestId } });
  }

  res.status(upstream.status);
  res.setHeader("cache-control", "no-store");
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) res.setHeader("content-disposition", disposition);

  if (!upstream.body) return res.end();
  Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream).on("error", () => res.destroy()).pipe(res);
}

const metricNames = ["health", "workload", "cycle-time", "delivery"] as const;
type MetricName = typeof metricNames[number];

function registerProjectMetric(metric: MetricName) {
  analyticsRouter.get(`/projects/:projectId/${metric}`, async (req, res, next) => {
    try {
      const access = await authorizeProject(req, routeParam(req, "projectId"));
      if (!access.ok) {
        if (access.error === "invalid") return res.status(400).json({ error: { code: "INVALID_PROJECT_ID", message: "projectId must be a valid UUID", requestId: req.requestId } });
        return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found", requestId: req.requestId } });
      }
      return await forwardAnalytics(req, res, `/v1/organizations/${req.auth!.organizationId}/projects/${access.project.id}/${metric}`);
    } catch (error) { return next(error); }
  });
}

for (const metric of metricNames) registerProjectMetric(metric);

analyticsRouter.get("/activity/export", async (req, res, next) => {
  try {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "format must be csv or jsonl and projectId must be a UUID", requestId: req.requestId } });
    const { format, projectId } = parsed.data;
    if (!canExportOrganizationActivity(req.auth!.role, projectId)) {
      return res.status(403).json({ error: { code: "PROJECT_SCOPE_REQUIRED", message: "Specify a projectId to export activity available to your membership", requestId: req.requestId } });
    }
    if (projectId) {
      const access = await authorizeProject(req, projectId);
      if (!access.ok) {
        if (access.error === "invalid") return res.status(400).json({ error: { code: "INVALID_PROJECT_ID", message: "projectId must be a valid UUID", requestId: req.requestId } });
        return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found", requestId: req.requestId } });
      }
    }
    const query = new URLSearchParams({ format });
    if (projectId) query.set("project_id", projectId);
    return await forwardAnalytics(req, res, `/v1/organizations/${req.auth!.organizationId}/activity/export?${query.toString()}`, 120_000);
  } catch (error) { return next(error); }
});
