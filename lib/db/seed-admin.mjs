// Creates the first admin user in an empty database.
// Usage:  DATABASE_URL=postgres://... pnpm run db:seed-admin -- admin@example.com "Vorname" "Nachname"
// The user is created WITHOUT a password. On first login the app shows the
// "Set your password" form (existing /api/auth/set-password flow).
import pg from "pg";
import { randomUUID } from "node:crypto";

// pnpm passes the "--" separator through to the script – drop it.
const args = process.argv.slice(2).filter((a) => a !== "--");
const [email, firstName = null, lastName = null] = args;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error('Usage: pnpm run db:seed-admin -- <email> ["Vorname"] ["Nachname"]');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const normalized = email.toLowerCase().trim();
  const existing = await pool.query("SELECT clerk_id, role FROM users WHERE email = $1", [normalized]);
  if (existing.rowCount > 0) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [normalized]);
    console.log(`User ${normalized} already exists – role set to admin.`);
  } else {
    await pool.query(
      "INSERT INTO users (clerk_id, email, first_name, last_name, role) VALUES ($1, $2, $3, $4, 'admin')",
      [randomUUID(), normalized, firstName, lastName],
    );
    console.log(`Admin ${normalized} created. Log in with this email – the app will ask you to set a password.`);
  }
} finally {
  await pool.end();
}
