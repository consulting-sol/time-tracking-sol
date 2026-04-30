import { Router } from "express";
import { db, timeEntriesTable, projectsTable, clientsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql, count, SQL } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";

const router = Router();

function buildDateConditions(dateFrom?: string, dateTo?: string): SQL[] {
  const conditions: SQL[] = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom));
  if (dateTo) conditions.push(lte(timeEntriesTable.date, dateTo));
  return conditions;
}

router.get("/analytics/summary", requireAdmin, async (req, res): Promise<void> => {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  const dateConditions = buildDateConditions(dateFrom, dateTo);

  const [totals] = await db
    .select({
      totalHours: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}::numeric), 0)`,
      totalEntries: count(timeEntriesTable.id),
    })
    .from(timeEntriesTable)
    .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

  const [{ totalProjects }] = await db
    .select({ totalProjects: count(projectsTable.id) })
    .from(projectsTable)
    .where(eq(projectsTable.isActive, true));

  const [{ totalConsultants }] = await db
    .select({ totalConsultants: count(usersTable.clerkId) })
    .from(usersTable);

  const totalHours = Number(totals.totalHours);
  const totalEntries = totals.totalEntries;

  res.json({
    totalHours,
    totalEntries,
    totalProjects,
    totalConsultants,
    avgHoursPerEntry: totalEntries > 0 ? totalHours / totalEntries : 0,
  });
});

router.get("/analytics/by-project", requireAdmin, async (req, res): Promise<void> => {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  const dateConditions = buildDateConditions(dateFrom, dateTo);

  const rows = await db
    .select({
      projectId: projectsTable.id,
      projectName: projectsTable.name,
      clientName: sql<string>`COALESCE(${clientsTable.name}, ${projectsTable.clientName})`,
      totalHours: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}::numeric), 0)`,
      entryCount: count(timeEntriesTable.id),
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(
      timeEntriesTable,
      and(
        eq(timeEntriesTable.projectId, projectsTable.id),
        ...(dateConditions.length > 0 ? dateConditions : []),
      ),
    )
    .groupBy(projectsTable.id, clientsTable.name)
    .orderBy(sql`SUM(${timeEntriesTable.hours}::numeric) DESC NULLS LAST`);

  res.json(rows.map((r) => ({ ...r, totalHours: Number(r.totalHours) })));
});

router.get("/analytics/by-user", requireAdmin, async (req, res): Promise<void> => {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  const dateConditions = buildDateConditions(dateFrom, dateTo);

  const rows = await db
    .select({
      userId: usersTable.clerkId,
      displayName: usersTable.firstName,
      email: usersTable.email,
      totalHours: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}::numeric), 0)`,
      entryCount: count(timeEntriesTable.id),
    })
    .from(usersTable)
    .leftJoin(
      timeEntriesTable,
      and(
        eq(timeEntriesTable.userId, usersTable.clerkId),
        ...(dateConditions.length > 0 ? dateConditions : []),
      ),
    )
    .groupBy(usersTable.clerkId)
    .orderBy(sql`SUM(${timeEntriesTable.hours}::numeric) DESC NULLS LAST`);

  res.json(rows.map((r) => ({ ...r, totalHours: Number(r.totalHours) })));
});

router.get("/analytics/my-summary", requireAuth, async (req, res): Promise<void> => {
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  const userCondition = eq(timeEntriesTable.userId, req.userId);
  const dateConditions = buildDateConditions(dateFrom, dateTo);
  const allConditions = [userCondition, ...dateConditions];

  const [totals] = await db
    .select({
      totalHours: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}::numeric), 0)`,
      totalEntries: count(timeEntriesTable.id),
    })
    .from(timeEntriesTable)
    .where(and(...allConditions));

  const projectBreakdown = await db
    .select({
      projectId: projectsTable.id,
      projectName: projectsTable.name,
      clientName: projectsTable.clientName,
      totalHours: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}::numeric), 0)`,
      entryCount: count(timeEntriesTable.id),
    })
    .from(timeEntriesTable)
    .leftJoin(projectsTable, eq(timeEntriesTable.projectId, projectsTable.id))
    .where(and(...allConditions))
    .groupBy(projectsTable.id)
    .orderBy(sql`SUM(${timeEntriesTable.hours}::numeric) DESC`);

  const recentEntries = await db
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
    .where(userCondition)
    .orderBy(sql`${timeEntriesTable.date} DESC, ${timeEntriesTable.createdAt} DESC`)
    .limit(10);

  res.json({
    totalHours: Number(totals.totalHours),
    totalEntries: totals.totalEntries,
    projectBreakdown: projectBreakdown.map((r) => ({
      ...r,
      totalHours: Number(r.totalHours),
      projectName: r.projectName ?? "Unknown",
    })),
    recentEntries: recentEntries.map((e) => ({
      ...e,
      hours: Number(e.hours),
      userDisplayName: e.userDisplayName ?? null,
      projectName: e.projectName ?? "Unknown",
    })),
  });
});

export default router;
