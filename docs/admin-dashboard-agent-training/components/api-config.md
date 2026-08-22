# API Config

Source: `frontend/M3/src/config/api.js`

Purpose:

- Computes and exports `API_BASE_URL`.

Environment variables:

- `VITE_API_BASE_URL`
- `VITE_LOCAL_API_BASE_URL`
- `VITE_USE_REMOTE_API_IN_DEV`

Default remote:

- `https://backend-three-omega-76.vercel.app/api`

Local default:

- `http://localhost:3030/api`

Important behavior:

- Base URLs are normalized to end with `/api`.
- Localhost uses local API unless remote dev mode is explicitly enabled.

