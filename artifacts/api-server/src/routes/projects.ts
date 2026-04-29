import { Router } from "express";
import { db, projectsTable, clientsTable, timeEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import {
  CreateProjectBody,
  UpdateProjectBody,
  ListProjectsQueryParams,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router = Router();

const projectSelect = {
  id: projectsTable.id,
  name: projectsTable.name,
  description: projectsTable.description,
  clientId: projectsTable.clientId,
  clientName: sql<string | null>`COALESCE(${clientsTable.name}, ${projectsTable.clientName})`,
  isActive: projectsTable.isActive,
  createdAt: projectsTable.createdAt,
  totalHours: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}::numeric), 0)`,
};

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  const activeOnly = query.success ? query.data.activeOnly : undefined;

  const projects = await db
    .select(projectSelect)
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(timeEntriesTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .where(activeOnly !== undefined ? eq(projectsTable.isActive, activeOnly) : undefined)
    .groupBy(projectsTable.id, clientsTable.name);

  res.json(projects);
});

router.post("/projects", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }
  const { name, description, clientName, clientId, isActive } = body.data;
  const [project] = await db.insert(projectsTable).values({
    name,
    description: description ?? null,
    clientName: clientId ? null : (clientName ?? null),
    clientId: clientId ?? null,
    isActive: isActive ?? true,
  }).returning();

  const [withJoin] = await db
    .select(projectSelect)
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(timeEntriesTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .where(eq(projectsTable.id, project.id))
    .groupBy(projectsTable.id, clientsTable.name);

  res.status(201).json(withJoin);
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const [project] = await db
    .select(projectSelect)
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(timeEntriesTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .where(eq(projectsTable.id, params.data.id))
    .groupBy(projectsTable.id, clientsTable.name);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.put("/projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data };
  if (body.data.clientId !== undefined) {
    updateData.clientName = body.data.clientId ? null : body.data.clientName;
  }

  await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id));

  const [updated] = await db
    .select(projectSelect)
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(timeEntriesTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .where(eq(projectsTable.id, params.data.id))
    .groupBy(projectsTable.id, clientsTable.name);

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(updated);
});

router.delete("/projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
