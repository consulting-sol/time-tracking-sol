# Time Tracker auf Vercel + Neon betreiben

Kosten: **0 CHF** (Vercel Hobby + Neon Free Tier). Keine eigene Domain nötig –
die App läuft unter `https://<name>.vercel.app`.

## Was wurde für den Umzug von Replit geändert

- `api/index.mjs` + `artifacts/api-server/src/vercel.ts`: Die Express-API läuft als
  Vercel Serverless Function (kein `app.listen`, gleicher Code, gleiche Routen).
- `vercel.json`: Build-Befehl, Output-Ordner, Routing (`/api/*` → Function, Rest → React-App).
- `artifacts/time-tracker/vite.config.ts`: Replit-Plugins entfernt, `PORT`/`BASE_PATH`
  haben Defaults, lokaler Dev-Proxy für `/api`.
- `pnpm-workspace.yaml`: Replit-Pakete und die "nur linux-x64"-Einschränkung entfernt
  (läuft jetzt auch auf Mac). `mockup-sandbox` (Replit-Design-Vorschau) ist aus dem Workspace ausgeklammert.
- `lib/db/src/index.ts`: kleinerer Connection-Pool (Serverless + Free-Tier-Limits).
- `lib/db/seed-admin.mjs`: legt den ersten Admin in einer leeren Datenbank an.
- `package.json`: Skripte `build:vercel`, `db:push`, `db:seed-admin`, `dev:api`, `dev:web`;
  Node 22 und pnpm 10 fixiert.

Die Replit-Dateien (`.replit`, `replit.md`, `.replit-artifact/`) sind harmlos und können gelöscht werden.

## 1. Code auf GitHub

```bash
cd Time-Tracker-Admin
git remote remove gitsafe-backup        # alter Replit-Remote
git add -A && git commit -m "Prepare for Vercel deployment"
# Neues (privates) Repo auf github.com anlegen, dann:
git remote add origin git@github.com:<dein-user>/time-tracker.git
git push -u origin main   # oder: master – siehe `git branch`
```

## 2. Datenbank bei Neon anlegen

1. https://neon.tech → Sign up (GitHub-Login) → "New Project", Region **Frankfurt (eu-central-1)**.
2. Connection String kopieren (Format `postgresql://...neon.tech/neondb?sslmode=require`).

## 3. Schema in die Datenbank schreiben + ersten Admin anlegen

Einmalig lokal auf deinem Mac (Node 22 + pnpm nötig: `corepack enable` reicht, pnpm wird dann automatisch geladen):

```bash
cd Time-Tracker-Admin
pnpm install
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
pnpm run db:push                                   # Tabellen anlegen (drizzle-kit push)
pnpm run db:seed-admin -- deine@mail.ch "Vorname" "Nachname"   # Admin ohne Passwort anlegen
```

Beim ersten Login mit dieser E-Mail zeigt die App "Set your password" – danach kannst du
weitere Nutzer wie bisher über die Users-Seite anlegen.

**Alte Daten aus Replit übernehmen?** Falls du noch Zugriff auf die Replit-Datenbank hast:

```bash
pg_dump --data-only --no-owner "$REPLIT_DATABASE_URL" > replit-data.sql
psql "$DATABASE_URL" < replit-data.sql      # nach db:push, vor/ohne seed-admin
```

(`pg_dump`/`psql` gibt es via `brew install libpq`.) Dann entfällt der Seed-Schritt, die
bestehenden Logins funktionieren weiter.

## 4. Vercel-Projekt anlegen

1. https://vercel.com → Sign up mit GitHub → "Add New… → Project" → das Repo importieren.
2. Framework Preset: **Other** (Build-Befehl und Output-Ordner kommen aus `vercel.json`).
3. Unter **Environment Variables** eintragen:

   | Name | Wert |
   |---|---|
   | `DATABASE_URL` | Connection String von Neon |
   | `SESSION_SECRET` | zufälliger String, z.B. `openssl rand -hex 32` |

4. **Deploy**. Nach ~1–2 Minuten ist die App unter `https://<projektname>.vercel.app` erreichbar.
   Den Namen kannst du unter Settings → General → Project Name ändern.

Jeder weitere `git push` auf `main` deployt automatisch neu.

## Lokal entwickeln

```bash
cp .env.example .env   # DATABASE_URL + SESSION_SECRET eintragen
set -a; source .env; set +a
pnpm run dev:api       # Express auf :8080
pnpm run dev:web       # Vite auf :5173, proxyt /api → :8080
```

## Bekannte Grenzen des Free Tiers

- **Neon Free**: 0.5 GB Speicher, DB schläft nach 5 Min Inaktivität ein → erster Request
  danach dauert ~1 s länger. Für Zeiteinträge völlig ausreichend.
- **Vercel Hobby**: nur für nicht-kommerzielle Nutzung; Function-Timeout 10 s (hier auf 30 s
  konfiguriert, wird auf Hobby automatisch gekappt – die API braucht ohnehin nur Millisekunden).
- Backups: Neon Free hat 24 h Point-in-time-Recovery. Für längere Aufbewahrung gelegentlich
  `pg_dump` ziehen oder den Excel-Export der App nutzen.
