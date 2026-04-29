import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userRole: string;
    }
  }
}

const DEV_BYPASS_CLERK_ID = "user_3D1yXHiFwOi7jJBlgf3P5x6Y0ux";

function resolveUserId(req: Request): string | null {
  const auth = getAuth(req);
  if (auth?.userId) return auth.userId;
  if (process.env.NODE_ENV !== "production") return DEV_BYPASS_CLERK_ID;
  return null;
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, userId),
  });
  req.userRole = user?.role ?? "consultant";
  next();
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, userId),
  });

  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.userRole = user.role;
  next();
};
