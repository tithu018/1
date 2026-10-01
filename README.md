# Waypoint

Waypoint is a role-based delivery operations workspace for Store Managers, Dispatchers, Loaders, and Drivers.

## Run locally

1. Copy `.env.example` to `.env` and set a long `SESSION_SECRET`.
2. Start PostgreSQL with `docker compose up -d`.
3. Install dependencies with `pnpm install`.
4. Generate the Prisma client with `pnpm db:generate`.
5. Apply the initial schema with `pnpm db:migrate -- --name init`.
6. Seed the demo accounts with `pnpm db:seed`.
7. Start the app with `pnpm dev`, then open `http://localhost:3000`.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Store Manager | `store@waypoint.demo` | `Store123!` |
| Dispatcher | `dispatcher@waypoint.demo` | `Dispatch123!` |
| Loader | `loader@waypoint.demo` | `Loader123!` |
| Driver | `driver@waypoint.demo` | `Driver123!` |

Use the matching role on the sign-in page. These credentials are only for local development.

## Checks

Run `pnpm lint`, `pnpm test`, and `pnpm build` before merging changes.
