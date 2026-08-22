# ProtectedRoute

Source: `frontend/M3/src/components/ProtectedRoute.jsx`

Purpose:

- Guards protected admin pages.
- Enforces optional role access.

Inputs:

- `children`: page element.
- `allowedRoles`: optional role array.

Local storage:

- Reads `adminToken`.
- Reads `adminData.role`.

Redirects:

- No token: `/admin/login`.
- Role denied: `/admin/dashboard`.

Change guidance:

- Keep this component synchronous.
- Do not add heavy API validation here unless designing a full auth refresh system.

