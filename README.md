# Waypoint

Waypoint is a role-based delivery operations platform for coordinating orders from outlet submission through planning, loading, delivery, receipt confirmation, and issue resolution.

The project provides purpose-built workspaces for Store Managers, Dispatchers, Loaders, and Drivers. The interface is based on the Waypoint Figma prototype and supports a complete, auditable delivery workflow backed by PostgreSQL.

## Highlights

- Four protected role-based workspaces with dedicated desktop and mobile interfaces.
- End-to-end order, planning, loading, delivery, receipt, and issue workflows.
- Assisted vehicle allocation with capacity, temperature, access, depot, brand, and district constraints.
- Versioned delivery plans and downstream re-verification when a plan changes.
- Delivery and loading exception reporting with a shared issue lifecycle.
- Driver offline, conflict-review, and synchronization states.
- Server-confirmed actions, notifications, status history, and audit records.
- Responsive Figma-aligned interface with high-resolution PNG artwork.
- Docker Compose deployment with automated migrations and health checks; demo seeding is an explicit opt-in command.

## User roles

| Role | Main responsibilities | Key screens |
| --- | --- | --- |
| Store Manager | Place and manage outlet orders, monitor status, confirm receipts, and review issues | Dashboard, Place Order, Order Status, Receive, History & Issues, Notifications, Settings |
| Dispatcher | Review the order queue, generate plans, inspect hard-rule results, publish plans, and resolve exceptions | Plan, Live Board, Needs Attention, Deferral Log, Capacity Forecast, Reference Data |
| Loader | Review assigned trips, load in the required sequence, report dock problems, and respond to plan changes | Trip Queue, Active Load, Loading Issues, Re-verification |
| Driver | Follow the assigned trip, enter safe-stop mode, record delivery outcomes, work offline, and synchronize records | Today, Active Trip, Navigation, Stop, Sync, Settings |

## Operational workflow

1. The Store Manager submits an order for an outlet and delivery window.
2. The Dispatcher reviews confirmed orders and generates an assisted plan.
3. Waypoint checks vehicle capacity, temperature, access, depot, brand, and district rules.
4. The Dispatcher records deferral reasons where necessary and publishes a versioned plan.
5. The Loader verifies each assigned stop and confirms the vehicle handoff.
6. The Driver completes the trip, records delivery outcomes, and synchronizes offline records when connectivity returns.
7. The Store Manager confirms the received quantities and reports any shortfall.
8. The Dispatcher reviews the combined Loader, Driver, and Store evidence and moves the issue through its lifecycle.

Order status follows this progression:

```text
Submitted → Confirmed → Allocated → Loaded → Out for delivery → Delivered
```

Issue cases follow this progression:

```text
Reported → Acknowledged → Under review → Resolved ↔ Reopened
```

## Architecture

```text
Browser
   │
   ▼
Next.js application container
   ├── React frontend and responsive role workspaces
   ├── Server Components and Server Actions
   ├── JWT session authentication and role authorization
   ├── Allocation and workflow domain logic
   └── Prisma data access
           │
           ▼
PostgreSQL container
```

The frontend and application backend run together in the `app` container. PostgreSQL runs in a separate `postgres` container. Docker Compose manages both services as one stack.

## Technology stack

| Area | Technology |
| --- | --- |
| Web application | Next.js 16, React 19, TypeScript |
| Styling | CSS Modules and responsive CSS |
| Database | PostgreSQL 16 |
| Data access | Prisma 6 |
| Authentication | Signed JWT session cookie with JOSE, bcrypt password hashing |
| Testing | Vitest |
| Package management | pnpm workspaces |
| Deployment | Docker and Docker Compose |

## Quick start with Docker

### Prerequisites

- Docker Desktop with Docker Compose
- Ports `3001` and `5433` available by default

### 1. Configure the environment

Create `.env` from the example file:

```powershell
Copy-Item .env.example .env
```

Set `SESSION_SECRET` to a long random value. A suitable value can be generated in PowerShell with:

```powershell
$sessionBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($sessionBytes)
[Convert]::ToBase64String($sessionBytes)
```

### 2. Build and start the complete stack

```powershell
docker compose up -d --build
```

Docker performs the following automatically:

1. Starts PostgreSQL and waits for it to become healthy.
2. Applies all committed Prisma migrations.
3. Seeds or refreshes the idempotent NOVA demonstration dataset.
4. Starts the optimized Next.js production server.
5. Checks application and database health.

Compose enables `SEED_DEMO_DATA=true` by default so a new local stack immediately shows database-backed outlets, orders, trips, loading progress, issues and demo accounts. Set it to `false` in `.env` when you want migrations without demonstration records. The seed preserves an existing non-demo published plan instead of replacing operational work, and it can also be run explicitly with `pnpm db:seed`.

For a new empty database, set `DISPATCHER_EMAIL`, `DISPATCHER_PASSWORD` (at least 12 characters), and optionally `DISPATCHER_NAME` and `DISPATCHER_DEPOT` (`Peliyagoda` or `Kandy`) in `.env`, then run `pnpm db:bootstrap`. This creates the two operating depots and one dispatcher account without adding sample stores or orders. Existing accounts are never overwritten.

## Dispatcher registration

Open **Registration** in the dispatcher sidebar to register a Store Manager for a Fresh, Style or Tech outlet. Registration creates a password-hashed account, links it to one outlet in the dispatcher's depot, and records an audit event. Existing unassigned outlets retain their saved master-data constraints.

New outlets require their ID, brand, district, dock and vehicle-access rules, and delivery window. Fresh windows must end by 08:00; mall outlets require access or booking instructions. Registered managers sign in using their email and supplied initial password. Their workspace reads their outlet's actual orders, receipts, issues and notifications, and shows empty states when no records exist.

### 3. Open the application

Visit [http://localhost:3001](http://localhost:3001) for Docker. Local `pnpm dev` continues to use [http://localhost:3000](http://localhost:3000).

The Docker health endpoint is available at [http://localhost:3001/api/health](http://localhost:3001/api/health). A healthy response resembles:

```json
{
  "service": "waypoint-web",
  "status": "ok",
  "database": "connected",
  "time": "2026-10-02T09:00:09.261Z"
}
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Store Manager | `store@waypoint.demo` | `Store123!` |
| Style Store Manager | `style@waypoint.demo` | `Style123!` |
| Tech Store Manager | `tech@waypoint.demo` | `Tech123!` |
| Dispatcher | `dispatcher@waypoint.demo` | `Dispatch123!` |
| Loader | `loader@waypoint.demo` | `Loader123!` |
| Driver | `driver@waypoint.demo` | `Driver123!` |

Select the matching role before signing in. These credentials are seeded for demonstration and local evaluation only.

## Docker operations

Start or rebuild the entire stack:

```powershell
docker compose up -d --build
```

Start without rebuilding existing images:

```powershell
docker compose up -d
```

Check service health:

```powershell
docker compose ps
```

Follow application logs:

```powershell
docker compose logs -f app
```

Follow database logs:

```powershell
docker compose logs -f postgres
```

Restart only the application:

```powershell
docker compose restart app
```

Stop the complete stack while retaining database data:

```powershell
docker compose down
```

Delete the containers and persisted database volume:

```powershell
docker compose down -v
```

> `docker compose down -v` permanently removes the local Waypoint database. Use it only when a clean reset is intended.

## Environment variables

| Variable | Purpose | Development default |
| --- | --- | --- |
| `POSTGRES_USER` | PostgreSQL user created by the database container | `waypoint` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `waypoint` |
| `POSTGRES_DB` | PostgreSQL database name | `waypoint` |
| `DATABASE_URL` | Prisma connection URL used by host-side development | `postgresql://waypoint:waypoint@127.0.0.1:5433/waypoint?schema=public` |
| `SESSION_SECRET` | Secret used to sign eight-hour authentication sessions | No secure default; replace the example value |

Inside Docker, Compose supplies an internal `DATABASE_URL` that addresses the database service as `postgres:5432`. The host-side URL continues to use `127.0.0.1:5433`.

Never commit `.env` or production credentials. The file is excluded from Git and the Docker build context.

## Local development

Use this workflow when running Next.js directly on the host while keeping PostgreSQL in Docker.

### Prerequisites

- Node.js 22 or a compatible supported Node.js release
- pnpm 10.11.0
- Docker Desktop

### Setup

```powershell
docker compose up -d postgres
pnpm install
pnpm db:generate
pnpm db:migrate -- --name init
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Stop the development server with `Ctrl+C`, then stop PostgreSQL with:

```powershell
docker compose down
```

Do not run the Docker `app` service and `pnpm dev` simultaneously because both use port `3000`.

## Available commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Create an optimized production build |
| `pnpm lint` | Run ESLint across the web application |
| `pnpm test` | Run the Vitest test suite |
| `pnpm db:generate` | Generate the Prisma Client |
| `pnpm db:migrate -- --name <name>` | Create and apply a development migration |
| `pnpm db:seed` | Seed or refresh the idempotent demo data |
| `docker compose up -d --build` | Build and start the complete production-style stack |
| `docker compose down` | Stop the stack without deleting database data |

## Validation

Before committing application changes, run:

```powershell
pnpm lint
pnpm test
pnpm build
```

For deployment changes, also run:

With a running app and an existing dispatcher, `pnpm --filter @waypoint/web exec node registration-smoke.mjs` verifies registration and sign-in for all three brands, manager workspace empty states, duplicate rejection and role access. It removes only the temporary accounts and outlets created by that test. Set `WAYPOINT_TEST_URL` to test another local port.

```powershell
docker compose build app
docker compose up -d
docker compose ps
curl.exe -fsS http://127.0.0.1:3000/api/health
```

Both `app` and `postgres` should report `healthy`.

## Repository structure

```text
.
├── apps/
│   └── web/                 Next.js application, routes, components, and public assets
├── packages/
│   ├── allocation/          Assisted planning and hard-rule evaluation
│   ├── database/            Prisma schema, migrations, seed data, and database client
│   └── domain/              Shared domain types, labels, catalog data, and role definitions
├── Dockerfile               Production application image
├── compose.yaml             Application and PostgreSQL services
├── pnpm-workspace.yaml      Monorepo workspace definition
└── package.json             Root commands and pinned pnpm version
```

## Core planning rules

The allocation package rejects or defers assignments that violate a hard rule:

- A vehicle in the workshop cannot be assigned.
- An order must remain within its depot.
- Chilled orders require a reefer vehicle.
- Van-only outlets require a van.
- A trip may serve only one brand.
- A trip may serve only one district.
- Total trip weight cannot exceed vehicle capacity.
- Total trip volume cannot exceed vehicle capacity.
- The same order cannot appear twice in a plan or trip.
- Whole orders are allocated; orders are not silently split.

The assisted planner proposes a plan, but the Dispatcher remains responsible for reviewing failures, recording deferral reasons, and publishing the final version.

## Authentication and security

- Passwords are stored as bcrypt hashes.
- Successful sign-in creates an `HttpOnly`, `SameSite=Lax` JWT cookie.
- Sessions expire after eight hours.
- Production cookies use the `Secure` flag.
- Server-rendered workspaces enforce the required role before loading data.
- Role selection and authenticated account role must match.
- `SESSION_SECRET` is required and must be replaced outside local demonstration environments.

## Data and persistence

PostgreSQL data is stored in the named Docker volume `waypoint-postgres`. Normal container restarts and `docker compose down` preserve that data.

The seed script uses stable demo identifiers and upserts for demonstration depots, outlets, vehicles, orders, accounts and order lines. Compose runs it when `SEED_DEMO_DATA=true`; local development can run it with `pnpm db:seed`. Operational screens render these database records without fabricated frontend fallback rows.

## Troubleshooting

### Port 3000 is already in use

Check whether another development server or container is running:

```powershell
docker compose ps
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Stop either the Docker stack with `docker compose down` or the host development server with `Ctrl+C`.

### Prisma reports `EPERM` while renaming its Windows engine

A running Node.js process is usually holding the Prisma DLL. Stop the development server, then run:

```powershell
pnpm db:generate
```

### The application container is unhealthy

Inspect the startup sequence:

```powershell
docker compose logs --tail 200 app
docker compose logs --tail 100 postgres
```

Confirm that migrations completed, the seed command finished, and Next.js reports `Ready`.

### Reset the local database

This removes all local Waypoint data and recreates the stack:

```powershell
docker compose down -v
docker compose up -d --build
```

### Rebuild after changing dependencies

```powershell
docker compose build --no-cache app
docker compose up -d
```

## Production considerations

Before deploying beyond a local or competition environment:

- Replace all demonstration credentials and use an external secrets manager.
- Set a strong, unique `SESSION_SECRET`.
- Do not expose PostgreSQL publicly unless required by the hosting platform.
- Terminate TLS at a reverse proxy or managed ingress.
- Add automated backups and retention policies for PostgreSQL.
- Run migrations as a controlled deployment step when multiple application replicas are used.
- Configure centralized logging, uptime monitoring, and error reporting.
- Review authorization and workflow policies against the final operational requirements.

## License

No license has been declared in this repository. Add an appropriate license before public distribution.
