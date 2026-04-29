import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function issueToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function cookieOptions(req: import("express").Request) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, String(email).toLowerCase().trim()),
  });

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.passwordHash) {
    res.status(403).json({ error: "no_password", message: "Account has no password set. Please set your password first." });
    return;
  }

  const valid = await bcrypt.compare(String(password), user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = issueToken(user.clerkId);
  res.cookie(COOKIE_NAME, token, cookieOptions(req));
  res.json({
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// Set password for an account that has none yet (first-time setup)
router.post("/auth/set-password", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, String(email).toLowerCase().trim()),
  });

  if (!user) {
    res.status(404).json({ error: "No account found for that email" });
    return;
  }

  if (user.passwordHash) {
    res.status(403).json({ error: "Password already set. Please log in normally." });
    return;
  }

  const hash = await bcrypt.hash(String(password), 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.clerkId, user.clerkId));

  const token = issueToken(user.clerkId);
  res.cookie(COOKIE_NAME, token, cookieOptions(req));
  res.json({
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
  });
});

export { COOKIE_NAME, JWT_SECRET };
export default router;
