# Workforce Hub

Authenticated employee and HR operations frontend for Helios Industries. The Django REST API is developed separately. This app talks to it through a typed service layer, and it can run against local demo data while that API is still being agreed.

## Requirements

- Node.js 24
- npm 11

## Install

```bash
npm install
cp .env.example .env.local
```

On Windows PowerShell, copy the example with `Copy-Item .env.example .env.local`.

## Demo mode

`.env.local` ships with:

```bash
NEXT_PUBLIC_DATA_MODE=demo
```

Demo mode is active only when `NODE_ENV` is not `production` and `NEXT_PUBLIC_DATA_MODE=demo`. A production build ignores the demo flag and always calls the configured API. There is no demo role switch that skips sign-in.

```bash
npm run dev
```

Open http://localhost:3000 and sign in. Demo records stay in this browser tab (`sessionStorage`). Use **Reset demo data** in the banner to restore the seed. Choosing **Remember this browser** stores only the demo user id in `localStorage`, not a token.

Development-only accounts, all using password `WorkforceHub1!`:

| Role | Email |
| --- | --- |
| Super Admin | super.admin@helios.example |
| HR Admin | hr.admin@helios.example |
| Department Manager | manager@helios.example |
| Project Manager | project.manager@helios.example |
| Employee | employee@helios.example |

Other seeded active addresses use the same password. `nico.inactive@helios.example` cannot sign in. The invitation token `demo-invite-grace` activates Grace Kim at `/invite/demo-invite-grace`. The password-reset token `demo-reset` updates `employee@helios.example` only.

## API mode

Set:

```bash
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_AUTH_STRATEGY=cookie
```

The UI does not fall back to demo data when a request fails.

Cookie mode (default) sends `credentials: "include"` and, when a readable `csrftoken` cookie exists, sends `X-CSRFToken`. It does not read HttpOnly session cookies. Bearer mode (`NEXT_PUBLIC_AUTH_STRATEGY=bearer`) keeps the access and refresh tokens in module memory for the tab. They are not written to `localStorage`.

If the API is on another origin, cookies will not be sent unless you proxy it. Set the server-only variable:

```bash
API_PROXY_TARGET=http://localhost:8000/api/v1
NEXT_PUBLIC_API_BASE_URL=/api/backend
```

Next.js rewrites `/api/backend/*` to that target. `src/proxy.ts` redirects unauthenticated API-mode requests when `AUTH_SESSION_COOKIE` is missing. The default cookie name `wf_access` is an assumption and must match Django. Bearer mode skips that cookie check because the token is not visible to the proxy.

Confirm every path in [API_CONTRACT.md](API_CONTRACT.md) with the backend developer before treating a route as available.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm start
```

`npm run test:e2e` needs a Chromium install: `npx playwright install chromium`. End-to-end tests expect demo mode from `.env.local`.

## Production build

```bash
npm run build
npm start
```

Set `NEXT_PUBLIC_DATA_MODE` to anything other than relying on demo. Production (`NODE_ENV=production`) never enables demo data, even if the flag is `demo`.
