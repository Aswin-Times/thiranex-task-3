# Atelier Commerce

A polished, full-stack e-commerce application created for the Thiranex internship task. Atelier combines an editorial storefront with secure accounts, a persistent cart, transactional checkout, order tracking, and a complete role-protected admin studio.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Aswin-Times/thiranex-task-3)

## Highlights

### Customer experience

- Responsive editorial product catalog with categories and search
- Detailed product views with live stock availability
- Persistent shopping bag with quantity controls
- Secure account registration and login
- Validated checkout that recalculates prices on the server
- Personal order history with fulfilment status tracking
- Mobile, tablet, and desktop layouts

### Admin studio

- Role-protected product creation, editing, and deletion
- Inventory and low-stock visibility
- All-customer order dashboard
- Order status workflow: pending, processing, shipped, delivered, or cancelled
- Revenue and inventory overview

### Backend and data

- REST API built with Express and TypeScript
- PostgreSQL schema created automatically on startup
- Password hashing with bcrypt and JWT sessions
- Transactional checkout with row locking and stock validation
- Parameterised SQL and Zod request validation
- Initial catalog and administrator seeding
- In-memory PostgreSQL-compatible mode for zero-setup local demos

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Lucide, date-fns |
| Backend | Node.js, Express, Zod, JWT, bcrypt |
| Database | PostgreSQL with `pg` |
| Testing | Vitest, Testing Library, Supertest, pg-mem |
| Deployment | Render Blueprint with managed PostgreSQL |

## Quick start

### Zero-setup demo

This mode uses an in-memory PostgreSQL-compatible database. Data resets whenever the server restarts.

```bash
git clone https://github.com/Aswin-Times/thiranex-task-3.git
cd thiranex-task-3
npm install
```

Create `.env` from `.env.example`, then set:

```env
DATABASE_URL=memory
JWT_SECRET=local-development-secret
```

Start both applications:

```bash
npm run dev
```

Open `http://localhost:5173`.

### Local PostgreSQL

If Docker is available:

```bash
docker compose up -d
cp .env.example .env
npm install
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Demo administrator

Local defaults and the provided Render Blueprint use:

- Email: `admin@atelier.demo` on Render, or `admin@atelier.local` locally
- Password: `ChangeMe-Atelier-2026` on Render, or `atelier-admin` locally

Change the deployed `ADMIN_PASSWORD` immediately if using the project beyond evaluation. Existing admin password hashes are refreshed at application startup.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string, or `memory` for local demo mode |
| `JWT_SECRET` | Production | Development fallback | Secret used to sign authentication tokens |
| `PORT` | No | `4000` | Unified HTTP server port |
| `CLIENT_ORIGIN` | No | Any origin | Comma-separated allowed browser origins |
| `ADMIN_EMAIL` | No | `admin@atelier.local` | Seed administrator email |
| `ADMIN_PASSWORD` | No | `atelier-admin` | Seed administrator password |

## Commands

```bash
npm run dev        # React and API development servers
npm run typecheck  # Strict TypeScript validation
npm test           # API integration and UI component tests
npm run build      # Production frontend build
npm start          # Production server
npm audit          # Dependency security check
```

## API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a customer account |
| `POST` | `/api/auth/login` | Public | Start a session |
| `GET` | `/api/auth/me` | User | Get the current account |
| `GET` | `/api/products` | Public | Browse and search products |
| `GET` | `/api/products/:id` | Public | Get a product |
| `POST` | `/api/products` | Admin | Create a product |
| `PATCH` | `/api/products/:id` | Admin | Update a product |
| `DELETE` | `/api/products/:id` | Admin | Delete a product |
| `POST` | `/api/orders` | User | Validate stock and place an order |
| `GET` | `/api/orders` | User/Admin | Get personal or all orders |
| `PATCH` | `/api/orders/:id/status` | Admin | Update fulfilment status |
| `GET` | `/api/health` | Public | Deployment health check |

Authenticated routes require `Authorization: Bearer <token>`.

## Checkout integrity

The client only sends product IDs and quantities. During checkout, the API:

1. Locks each selected product row.
2. Reads the current price and inventory from PostgreSQL.
3. Rejects unavailable quantities.
4. Calculates the authoritative total.
5. Creates the order and item snapshots.
6. Decrements stock inside the same transaction.

This prevents users from changing prices in the browser and protects inventory from overselling.

## Project structure

```text
server/
  app.ts             API routes and commerce rules
  auth.ts            JWT authentication and role guards
  database.ts        PostgreSQL connection, schema, and seed data
  app.test.ts        Integration tests
src/
  components/        Storefront, cart, checkout, account, and admin UI
  App.tsx             Application state and view orchestration
  api.ts              Typed API client
  styles.css          Responsive visual system
render.yaml           Web service and PostgreSQL deployment blueprint
```

## Verification

The project is checked with strict TypeScript, six automated tests, a production build, dependency auditing, and GitHub Actions on every push.

