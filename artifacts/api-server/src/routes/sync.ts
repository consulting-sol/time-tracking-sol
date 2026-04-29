import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { createClerkClient } from "@clerk/express";

const router = Router();

// Auto-sync a Clerk user into the local users table when they hit /api/users/me
// This also handles the case where a user is not yet in our DB but is authenticated in Clerk
router.post("/users/sync", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, userId),
  });

  if (existing) {
    res.json({ synced: false, user: existing });
    return;
  }

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const clerkUser = await clerkClient.users.getUser(userId);

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmail) {
    res.status(400).json({ error: "No email found for user" });
    return;
  }

  const isFirstUser = (await db.select().from(usersTable)).length === 0;

  const [user] = await db.insert(usersTable).values({
    clerkId: userId,
    email: primaryEmail,
    firstName: clerkUser.firstName ?? null,
    lastName: clerkUser.lastName ?? null,
    role: isFirstUser ? "admin" : "consultant",
  }).returning();

  res.json({ synced: true, user });
});

export default router;
