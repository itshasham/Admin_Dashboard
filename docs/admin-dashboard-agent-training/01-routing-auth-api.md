# Routing, Auth, And API Base

## Route Registration

All routes live in `frontend/M3/src/App.jsx`.

The app lazy-loads page components with `React.lazy` and wraps routes in a global `Suspense` fallback. This keeps the initial bundle smaller and makes every major feature a page-level module.

Core public routes:

- `/`: redirects by auth state.
- `/admin/login`: admin login.
- `/admin/register`: staff/admin registration request.
- `/admin/forgot-password`: password reset request.
- `/admin/reset-password/:token`: reset form.
- `/forget-password/:token`: legacy email-link redirect to `/admin/reset-password/:token`.

Protected routes:

- `/admin/dashboard`
- `/admin/staff`
- `/admin/brands`
- `/admin/categories`
- `/admin/products`
- `/admin/clinical-products`
- `/admin/machines`
- `/admin/accessories`
- `/admin/blogs`
- `/admin/training-events`
- `/admin/training-events/registrations`
- `/admin/training-events/:id/registrations`
- `/admin/orders`
- `/admin/orders/:id`
- `/admin/users`
- `/admin/coupons`
- `/admin/cloudinary`
- `/admin/contact-us`

## Auth Guard

File: `frontend/M3/src/components/ProtectedRoute.jsx`

Purpose:

- Prevent unauthenticated access.
- Enforce optional role lists.
- Redirect denied users safely.

Behavior:

- Reads `adminToken` from `localStorage`.
- Reads `adminData` from `localStorage` and extracts `role`.
- If no token: redirects to `/admin/login` and stores attempted path in route state.
- If `allowedRoles` is provided and role is missing from the list: redirects to `/admin/dashboard`.
- Otherwise renders child page.

Do not add backend calls to `ProtectedRoute`; keep it lightweight and synchronous.

## Login

File: `frontend/M3/src/pages/AdminLogin.jsx`

Purpose:

- Authenticate admin user.
- Store token/profile.
- Enter dashboard.

Endpoint:

- `POST /admin/login`

Local storage written:

- `adminToken`: `data.token`
- `adminData`: full response object serialized as JSON

Successful login navigates to `/admin/dashboard`.

## Registration

File: `frontend/M3/src/pages/AdminRegister.jsx`

Purpose:

- Create admin/staff account records through the backend.

Endpoint:

- `POST /admin/register`

Important behavior:

- Validates password and confirm password match before API call.
- On success, waits briefly and navigates to `/admin/login`.

## Forgot And Reset Password

Files:

- `AdminForgotPassword.jsx`
- `AdminResetPassword.jsx`

Endpoints:

- `POST /admin/forget-password`
- `POST /admin/confirm-forget-password`

Reset flow:

- Token comes from route param.
- Reset form validates password confirmation.
- On success, redirects to login.

## API Base Selection

File: `frontend/M3/src/config/api.js`

Exports:

- `API_BASE_URL`

Default remote API:

- `https://backend-three-omega-76.vercel.app/api`

Local dev behavior:

- If running on `localhost`, `127.0.0.1`, or `0.0.0.0`, and no explicit remote override is set, the app uses `VITE_LOCAL_API_BASE_URL` or `http://localhost:3030/api`.
- Set `VITE_USE_REMOTE_API_IN_DEV=true` to force remote API in local dev.
- Set `VITE_API_BASE_URL` to override base URL.

Important:

- `normalizeBaseUrl` ensures the final value ends with `/api`.
- All page endpoints append paths after `API_BASE_URL`.

## Auth Header Pattern

Most pages define a local helper:

```js
const token = localStorage.getItem("adminToken");
return token ? { Authorization: `Bearer ${token}` } : {};
```

For new pages, follow this pattern until a shared API client is introduced.

