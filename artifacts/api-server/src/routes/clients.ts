import { Router } from "express";
import { db, clientsTable, projectsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";
import { z } from "zod";

const CreateClientBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const UpdateClientBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

const router = Router();

router.get("/clients", requireAdmin, async (req, res): Promise<void> => {
  const clients = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      description: clientsTable.description,
      createdAt: clientsTable.createdAt,
      projectCount: sql<number>`COUNT(${projectsTable.id})`,
    })
    .from(clientsTable)
    .leftJoin(projectsTable, eq(projectsTable.clientId, clientsTable.id))
    .groupBy(clientsTable.id)
    .orderBy(clientsTable.name);

  res.json(clients);
});

router.post("/clients", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }
  const [client] = await db
    .insert(clientsTable)
    .values({ name: body.data.name, description: body.data.description ?? null })
    .returning();
  res.status(201).json({ ...client, projectCount: 0 });
});

router.get("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [client] = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      description: clientsTable.description,
      createdAt: clientsTable.createdAt,
      projectCount: sql<number>`COUNT(${projectsTable.id})`,
    })
    .from(clientsTable)
    .leftJoin(projectsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(clientsTable.id, id))
    .groupBy(clientsTable.id);

  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json(client);
});

router.put("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UpdateClientBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.issues }); return; }

  const updates: Partial<{ name: string; description: string | null }> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.description !== undefined) updates.description = body.data.description;

  const [updated] = await db
    .update(clientsTable)
    .set(updates)
    .where(eq(clientsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Client not found" }); return; }

  const [withCount] = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      description: clientsTable.description,
      createdAt: clientsTable.createdAt,
      projectCount: sql<number>`COUNT(${projectsTable.id})`,
    })
    .from(clientsTable)
    .leftJoin(projectsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(clientsTable.id, id))
    .groupBy(clientsTable.id);

  res.json(withCount);
});

router.delete("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.status(204).send();
});

export default router;
