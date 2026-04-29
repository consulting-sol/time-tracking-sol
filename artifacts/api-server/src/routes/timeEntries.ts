import { Router } from "express";
import { db, timeEntriesTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  CreateTimeEntryBody,
  UpdateTimeEntryBody,
  ListTimeEntriesQueryParams,
  GetTimeEntryParams,
  UpdateTimeEntryParams,
  DeleteTimeEntryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/time-entries", requireAuth, async (req, res): Promise<void> => {
  const query = ListTimeEntriesQueryParams.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions: SQL[] = [];

  if (req.userRole !== "admin") {
    conditions.push(eq(timeEntriesTable.userId, req.userId));
  } else if (params.userId) {
    conditions.push(eq(timeEntriesTable.userId, params.userId));
  }

  if (params.projectId) {
    conditions.push(eq(timeEntriesTable.projectId, params.projectId));
  }
  if (params.dateFrom) {
    const df = params.dateFrom instanceof Date ? params.dateFrom.toISOString().slice(0, 10) : String(params.dateFrom);
    conditions.push(gte(timeEntriesTable.date, df));
  }
  if (params.dateTo) {
    const dt = params.dateTo instanceof Date ? params.dateTo.toISOString().slice(0, 10) : String(params.dateTo);
    conditions.push(lte(timeEntriesTable.date, dt));
  }

  const entries = await db
    .select({
      id: timeEntriesTable.id,
      userId: timeEntriesTable.userId,
      userDisplayName: usersTable.firstName,
      projectId: timeEntriesTable.projectId,
      projectName: projectsTable.name,
      description: timeEntriesTable.description,
      date: timeEntriesTable.date,
      hours: timeEntriesTable.hours,
      createdAt: timeEntriesTable.createdAt,
    })
    .from(timeEntriesTable)
    .leftJoin(projectsTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(timeEntriesTable.userId, usersTable.clerkId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(timeEntriesTable.date);

  const result = entries.map((e) => ({
    ...e,
    hours: Number(e.hours),
    userDisplayName: e.userDisplayName ?? null,
    projectName: e.projectName ?? "Unknown",
  }));

  res.json(result);
});

router.post("/time-entries", requireAuth, async (req, res): Promise<void> => {
  const body = CreateTimeEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  const project = await db.query.projectsTable.findFirst({
    where: eq(projectsTable.id, body.data.projectId),
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [entry] = await db.insert(timeEntriesTable).values({
    userId: req.userId,
    projectId: body.data.projectId,
    description: body.data.description,
    date: body.data.date instanceof Date ? body.data.date.toISOString().slice(0, 10) : String(body.data.date),
    hours: String(body.data.hours),
  }).returning();

  res.status(201).json({
    ...entry,
    hours: Number(entry.hours),
    projectName: project.name,
    userDisplayName: null,
  });
});

router.get("/time-entries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTimeEntryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid time entry id" });
    return;
  }

  const [entry] = await db
    .select({
      id: timeEntriesTable.id,
      userId: timeEntriesTable.userId,
      userDisplayName: usersTable.firstName,
      projectId: timeEntriesTable.projectId,
      projectName: projectsTable.name,
      description: timeEntriesTable.description,
      date: timeEntriesTable.date,
      hours: timeEntriesTable.hours,
      createdAt: timeEntriesTable.createdAt,
    })
    .from(timeEntriesTable)
    .leftJoin(projectsTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(timeEntriesTable.userId, usersTable.clerkId))
    .where(eq(timeEntriesTable.id, params.data.id));

  if (!entry) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }

  if (req.userRole !== "admin" && entry.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({
    ...entry,
    hours: Number(entry.hours),
    userDisplayName: entry.userDisplayName ?? null,
    projectName: entry.projectName ?? "Unknown",
  });
});

router.put("/time-entries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTimeEntryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid time entry id" });
    return;
  }

  const existing = await db.query.timeEntriesTable.findFirst({
    where: eq(timeEntriesTable.id, params.data.id),
  });
  if (!existing) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }
  if (req.userRole !== "admin" && existing.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = UpdateTimeEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  const updateData: Partial<typeof existing> = {};
  if (body.data.projectId !== undefined) updateData.projectId = body.data.projectId;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.date !== undefined) updateData.date = body.data.date instanceof Date ? body.data.date.toISOString().slice(0, 10) : String(body.data.date);
  if (body.data.hours !== undefined) updateData.hours = String(body.data.hours);

  const [updated] = await db
    .update(timeEntriesTable)
    .set(updateData)
    .where(eq(timeEntriesTable.id, params.data.id))
    .returning();

  const project = await db.query.projectsTable.findFirst({
    where: eq(projectsTable.id, updated.projectId),
  });

  res.json({
    ...updated,
    hours: Number(updated.hours),
    projectName: project?.name ?? "Unknown",
    userDisplayName: null,
  });
});

router.delete("/time-entries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid time entry id" });
    return;
  }

  const existing = await db.query.timeEntriesTable.findFirst({
    where: eq(timeEntriesTable.id, params.data.id),
  });
  if (!existing) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }
  if (req.userRole !== "admin" && existing.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  res.status(204).send();
});

export default router;
