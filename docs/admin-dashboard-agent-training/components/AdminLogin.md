# AdminLogin

Source: `frontend/M3/src/pages/AdminLogin.jsx`

Route: `/admin/login`

Purpose:

- Authenticates admin users.

Endpoint:

- `POST /admin/login`

State:

- `formData`
- `loading`
- `error`

Success behavior:

- Saves `adminToken`.
- Saves `adminData`.
- Navigates to `/admin/dashboard`.

