import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { InviteUserBody, UpdateUserBody } from "@workspace/api-zod";
import { createClerkClient } from "@clerk/express";

const router = Router();

function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

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
    ...user,
    displayName: getDisplayName(user.firstName, user.lastName, user.email),
    totalHours: null,
  });
});

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  const result = users.map((u) => ({
    ...u,
    displayName: getDisplayName(u.firstName, u.lastName, u.email),
    totalHours: null,
  }));

  res.json(result);
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const body = InviteUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.issues });
    return;
  }

  const { email, firstName, lastName, role, password } = body.data;

  const clerkClient = getClerkClient();

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to create Clerk user");
    const errMsg = err instanceof Error ? err.message : "Failed to create user";
    res.status(400).json({ error: errMsg });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    clerkId: clerkUser.id,
    email,
    firstName: firstName ?? null,
    lastName: lastName ?? null,
    role,
  }).returning();

  res.status(201).json({
    ...user,
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
    ...user,
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
    ...user,
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

  const clerkClient = getClerkClient();
  try {
    await clerkClient.users.deleteUser(clerkId);
  } catch (err) {
    req.log.warn({ err }, "Could not delete Clerk user");
  }

  await db.delete(usersTable).where(eq(usersTable.clerkId, clerkId));
  res.status(204).send();
});

export default router;
