# Operations And Agent Guardrails

## Local Development

From `frontend/M3`:

```bash
npm ci
npm run dev
```

Default Vite dev server is usually `http://localhost:5173`.

API behavior in local dev:

- By default, local host uses `http://localhost:3030/api`.
- Set `VITE_USE_REMOTE_API_IN_DEV=true` to use the remote backend.
- Set `VITE_API_BASE_URL` to force a specific backend.

## Build

From `frontend/M3`:

```bash
npm run build
```

Root Vercel deployment runs:

```bash
npm --prefix frontend/M3 ci
npm --prefix frontend/M3 run build
```

## Lint Status

The repo has existing lint debt. Known categories:

- Unused `React` imports.
- Missing prop-types.
- Hook dependency warnings.
- A few older empty blocks/unused variables in unrelated modules.

Do not treat existing repo-wide lint failures as proof that a targeted change is broken. For targeted work, run build and inspect changed files.

## Vercel Deployment

Admin dashboard deploy account:

- Login: `hashamtahir4806-3500`
- Team: `hasham-tahirs-projects`
- Project: `admin-dashboard-m3`
- Live URL: `https://admin-dashboard-m3.vercel.app`

Deploy command used locally:

```bash
vercel deploy --prod --yes --global-config /Users/macuser/.vercel-hashamtahir4806
```

The separate global config prevents overwriting the backend Vercel login.

## Git Branch Notes

Recent admin work:

- Bulk PMDC verification was merged into `main`.
- Main was deployed after merge.

Before committing:

- Check `git status --short --branch`.
- Avoid including generated `frontend/M3/dist` churn unless explicitly required.
- Use source changes under `frontend/M3/src` and docs changes under `docs`.

## Agent Change Rules

When editing this app:

- Preserve localStorage auth keys: `adminToken`, `adminData`.
- Preserve route paths unless coordinating with users/bookmarks.
- Preserve backend fallback endpoints in orders and clinical products.
- Keep role gates aligned with business rules.
- Do not remove PMDC browser/server fallback behavior casually.
- Avoid broad rewrites; many modules have legacy backend compatibility baked in.

## Verification Checklist

For page changes:

- `npm run build` in `frontend/M3`
- Manually inspect changed routes if UI behavior changed.
- Confirm API path and auth header.
- Confirm role access behavior.
- Confirm empty/loading/error states still render.

For deployment:

- Deploy from clean `main` or intended branch.
- Confirm Vercel status is Ready.
- Confirm live alias after deploy.

