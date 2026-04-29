import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router = Router();

function getDisplayName(firstName?: string | null, lastName?: string | null, email?: string): string | null {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return email ?? null;
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, req.userId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    displayName: getDisplayName(user.firstName, user.lastName, user.email),
    totalHours: null,
  });
});

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  const result = users.map((u) => ({
    clerkId: u.clerkId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    createdAt: u.createdAt,
    displayName: getDisplayName(u.firstName, u.lastName, u.email),
    totalHours: null,
  }));

  res.json(result);
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  const { email, firstName, lastName, role, password } = body.data;

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email.toLowerCase().trim()),
  });
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  const [user] = await db.insert(usersTable).values({
    clerkId: userId,
    email: email.toLowerCase().trim(),
    firstName,
    lastName,
    role,
    passwordHash,
  }).returning();

  res.status(201).json({
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    displayName: getDisplayName(user.firstName, user.lastName, user.email),
    totalHours: null,
  });
});

router.get("/users/:clerkId", requireAdmin, async (req, res): Promise<void> => {
  const clerkId = Array.isArray(req.params.clerkId) ? req.params.clerkId[0] : req.params.clerkId;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    displayName: getDisplayName(user.firstName, user.lastName, user.email),
    totalHours: null,
  });
});

router.put("/users/:clerkId", requireAdmin, async (req, res): Promise<void> => {
  const clerkId = Array.isArray(req.params.clerkId) ? req.params.clerkId[0] : req.params.clerkId;
  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  const updateData: Partial<{ role: string; firstName: string | null; lastName: string | null }> = {};
  if (body.data.role !== undefined) updateData.role = body.data.role;
  if (body.data.firstName !== undefined) updateData.firstName = body.data.firstName ?? null;
  if (body.data.lastName !== undefined) updateData.lastName = body.data.lastName ?? null;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    displayName: getDisplayName(user.firstName, user.lastName, user.email),
    totalHours: null,
  });
});

router.delete("/users/:clerkId", requireAdmin, async (req, res): Promise<void> => {
  const clerkId = Array.isArray(req.params.clerkId) ? req.params.clerkId[0] : req.params.clerkId;
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.clerkId, clerkId));
  res.status(204).send();
});

export default router;
