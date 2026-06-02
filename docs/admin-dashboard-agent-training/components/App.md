# App

Source: `frontend/M3/src/App.jsx`

Purpose:

- Defines the SPA route table.
- Lazy-loads all page components.
- Sets the admin document title.
- Redirects root users based on auth state.

Key behavior:

- `/` redirects to `/admin/dashboard` when `adminToken` exists, otherwise `/admin/login`.
- All protected admin routes are wrapped with `ProtectedRoute`.
- `allowedRoles` is passed only on restricted modules such as categories, coupons, and contact messages.
- `Suspense` fallback is a simple padded `Loading...` view.

Change guidance:

- Add new admin pages here with lazy imports.
- Keep Vercel rewrite support in mind; routes must work as client-side SPA paths.

