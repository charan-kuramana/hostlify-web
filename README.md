# Hostlify Web

React 19 + TypeScript + Vite front end for Hostlify, a hostel management platform. It serves three portals from one app:

| Portal | Path | Login |
| --- | --- | --- |
| Hosteller (residents) | `/app/*` | `/auth/login` |
| Staff (owners, admins, managers) | `/admin/*` | `/auth/staff/login` |
| Super Admin | `/super-admin/*` | `/auth/super-admin/login` |

The API lives in [hostlify-api](https://github.com/charan-kuramana/hostlify-api).

## Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · TanStack Query · Zustand · React Router 6 · Axios · lucide-react

## Run locally

1. Start the API and database (see the hostlify-api README: `docker compose up -d`).
2. Install and run the web app:

```bash
npm install
npm run dev        # http://localhost:5173
```

The API URL comes from `.env` (`VITE_API_URL=http://localhost:8090/api/v1`).

Demo logins (password `Test@1234` for all): `superadmin@test.com`, `owner.bliss@test.com`, `hosteller@test.com`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |

## Project layout

```
src/
  api/          API wrappers per portal (auth, hosteller, staff, superadmin) + axios client with token refresh
  guards/       AuthGuard (login redirect per portal) and RoleGuard
  layouts/      Shared portal shell + one layout per portal
  pages/
    auth/       Login, signup, forgot password
    app/        Hosteller pages
    admin/      Staff pages
    super-admin/
  store/        Zustand auth and toast stores
  components/   Shared UI
```
