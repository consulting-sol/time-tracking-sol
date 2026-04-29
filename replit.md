# Workspace

## Overview

Time tracking web app for a student consulting organization. Consultants log hours against projects, and admins manage projects, users, and analyze time data.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (Replit-managed)
- **Frontend**: React + Vite (Tailwind CSS, shadcn/ui, wouter routing)
- **Charts**: Recharts

## Artifacts

- **time-tracker** (React + Vite): Main web app at `/`. Full time tracking UI for consultants and admins.
- **api-server** (Express 5): Backend API at `/api`. All REST endpoints including auth middleware.

## Key Features

- **Consultants**: Log time entries (project, date, hours, description), view own history and summary
- **Admins**: Manage clients (create/edit/delete), manage projects linked to clients, manage users (invite/set roles/delete), analytics dashboard, view all time entries with grouping and Excel export
- **Auth**: First user to sign up becomes admin automatically; subsequent users are consultants by default

## Database Tables

- `clients` - Client organisations with name, description, createdAt
- `projects` - Projects with name, description, clientId (FK -> clients, nullable), clientName (legacy text), isActive. When displaying clientName: COALESCE(clients.name, projects.client_name)
- `users` - User records linked to Clerk IDs, with role (admin/consultant)
- `time_entries` - Time logs linked to users and projects

## Key Commands

- `pnpm run typecheck` - full typecheck across all packages
- `pnpm run build` - typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` - regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` - push DB schema changes (dev only)

## Important Notes

- After running codegen, the generated `lib/api-zod/src/index.ts` may incorrectly add `export * from "./generated/api.schemas"`. Always fix it to only export from `"./generated/api"`.
- `zod` is in `@workspace/api-server` dependencies as `"zod": "catalog:"`.
- Dev auth bypass: `requireAuth.ts` falls back to hardcoded Clerk ID `user_3D1yXHiFwOi7jJBlgf3P5x6Y0ux` (Fabian Alberti, admin) when no token and NODE_ENV !== "production".

## Routes

### Frontend (time-tracker)
- `/` - Landing page (redirects to /dashboard)
- `/dashboard` - Consultant dashboard with personal summary
- `/time-entries` - View/delete own time entries
- `/time-entries/new` - Log new time entry
- `/time-entries/:id/edit` - Edit a time entry
- `/admin/analytics` - Admin: analytics charts (By Project/Client/Consultant toggle)
- `/admin/time-entries` - Admin: all entries with grouping and Excel export
- `/admin/clients` - Admin: manage client organisations
- `/admin/projects` - Admin: manage projects (linked to clients)
- `/admin/users` - Admin: manage team members

### API (api-server)
- `GET/POST /api/clients` - List/create clients (admin)
- `GET/PUT/DELETE /api/clients/:id` - Get/update/delete client (admin)
- `GET/POST /api/projects` - List/create projects
- `GET/PUT/DELETE /api/projects/:id` - Get/update/delete project
- `GET/POST /api/time-entries` - List/create time entries
- `GET/PUT/DELETE /api/time-entries/:id` - Get/update/delete time entry
- `POST /api/users/sync` - Auto-sync Clerk user to local DB
- `GET/POST /api/users` - List/invite users (admin)
- `GET/PUT/DELETE /api/users/:clerkId` - Get/update/delete user (admin)
- `GET /api/analytics/summary` - Overall analytics (admin)
- `GET /api/analytics/by-project` - Hours by project (admin)
- `GET /api/analytics/by-user` - Hours by user (admin)
- `GET /api/analytics/my-summary` - Personal summary

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
