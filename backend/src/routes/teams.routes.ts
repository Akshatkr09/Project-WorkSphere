import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";

export const teamsRouter = Router();

// Express 5 route params are typed as a broad union in this project's installed
// typings. Express supplies string values for named path parameters at runtime.
function routeParam(req: Request, name: string): string {
  const value = (req.params as Record<string, unknown>)[name];
  if (typeof value !== "string") throw new Error(`Missing route parameter: ${name}`);
  return value;
}
teamsRouter.use(requireAuth);

const managerRoles = ["OWNER", "ADMIN", "PROJECT_MANAGER"] as const;
const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional()
});
const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional()
}).refine(value => Object.keys(value).length > 0, "At least one field must change");

teamsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const where = { organizationId: req.auth!.organizationId };
    const [data, total] = await prisma.$transaction([
      prisma.team.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { members: true, projects: true } } }
      }),
      prisma.team.count({ where })
    ]);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});

teamsRouter.post("/", allowRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = createTeamSchema.parse(req.body);
    const team = await prisma.team.create({
      data: { ...input, organizationId: req.auth!.organizationId, createdById: req.auth!.userId }
    });
    res.status(201).json({ data: team });
  } catch (error) { next(error); }
});

teamsRouter.get("/:teamId", async (req, res, next) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: routeParam(req, "teamId"), organizationId: req.auth!.organizationId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { projects: true } }
      }
    });
    if (!team) return res.status(404).json({ error: { code: "TEAM_NOT_FOUND", message: "Team not found" } });
    res.json({ data: team });
  } catch (error) { next(error); }
});

teamsRouter.patch("/:teamId", allowRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = updateTeamSchema.parse(req.body);
    const existing = await prisma.team.findFirst({
      where: { id: routeParam(req, "teamId"), organizationId: req.auth!.organizationId },
      select: { id: true }
    });
    if (!existing) return res.status(404).json({ error: { code: "TEAM_NOT_FOUND", message: "Team not found" } });
    const team = await prisma.team.update({ where: { id: existing.id }, data: input });
    res.json({ data: team });
  } catch (error) { next(error); }
});

teamsRouter.delete("/:teamId", allowRoles(...managerRoles), async (req, res, next) => {
  try {
    const result = await prisma.team.deleteMany({
      where: { id: routeParam(req, "teamId"), organizationId: req.auth!.organizationId }
    });
    if (result.count !== 1) return res.status(404).json({ error: { code: "TEAM_NOT_FOUND", message: "Team not found" } });
    res.status(204).send();
  } catch (error) { next(error); }
});

teamsRouter.post("/:teamId/members", allowRoles(...managerRoles), async (req, res, next) => {
  try {
    const input = z.object({
      userId: z.string().uuid(),
      role: z.enum(["LEAD", "MEMBER"]).default("MEMBER")
    }).parse(req.body);
    const team = await prisma.team.findFirst({
      where: { id: routeParam(req, "teamId"), organizationId: req.auth!.organizationId },
      select: { id: true }
    });
    if (!team) return res.status(404).json({ error: { code: "TEAM_NOT_FOUND", message: "Team not found" } });

    const membership = await prisma.membership.findFirst({
      where: { organizationId: req.auth!.organizationId, userId: input.userId, status: "ACTIVE" },
      select: { id: true }
    });
    if (!membership) return res.status(422).json({ error: { code: "INVALID_TEAM_MEMBER", message: "User must be an active member of this workspace" } });

    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: input.userId } },
      create: { teamId: team.id, userId: input.userId, role: input.role },
      update: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(200).json({ data: member });
  } catch (error) { next(error); }
});

teamsRouter.delete("/:teamId/members/:userId", allowRoles(...managerRoles), async (req, res, next) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: routeParam(req, "teamId"), organizationId: req.auth!.organizationId },
      select: { id: true }
    });
    if (!team) return res.status(404).json({ error: { code: "TEAM_NOT_FOUND", message: "Team not found" } });
    const removed = await prisma.teamMember.deleteMany({ where: { teamId: team.id, userId: routeParam(req, "userId") } });
    if (!removed.count) return res.status(404).json({ error: { code: "TEAM_MEMBER_NOT_FOUND", message: "Team member not found" } });
    res.status(204).send();
  } catch (error) { next(error); }
});
