# System Map

## Repository Layout

- `vercel.json`: root deployment config. Vercel installs and builds `frontend/M3`.
- `frontend/M3/package.json`: app scripts and dependencies.
- `frontend/M3/src/App.jsx`: route table and lazy page registration.
- `frontend/M3/src/config/api.js`: backend base URL selection.
- `frontend/M3/src/components/ProtectedRoute.jsx`: auth and role route guard.
- `frontend/M3/src/pages`: all page-level admin modules.
- `frontend/M3/src/utils/api-error.js`: API error parsing helper used by newer modules.
- `frontend/M3/src/store/token.jsx`: legacy auth context utilities.

## Build And Runtime

Admin is a Vite SPA. The deployed build outputs static assets into `frontend/M3/dist`.

Root `vercel.json`:

- `installCommand`: `npm --prefix frontend/M3 ci`
- `buildCommand`: `npm --prefix frontend/M3 run build`
- `outputDirectory`: `frontend/M3/dist`
- Rewrite: all paths route to `index.html`

Because it is an SPA, client-side routes such as `/admin/orders` need the Vercel rewrite to work on refresh.

## Main Application Flow

1. User opens `/`.
2. `RootRedirect` checks `localStorage.adminToken`.
3. If token exists, route goes to `/admin/dashboard`; otherwise `/admin/login`.
4. Protected pages are wrapped in `ProtectedRoute`.
5. `ProtectedRoute` checks:
   - `localStorage.adminToken`
   - `localStorage.adminData.role`
   - optional `allowedRoles`
6. Pages call backend endpoints through `API_BASE_URL`.

## Roles

The app expects admin roles such as:

- `CEO`
- `Manager`
- `Admin`

Route-level restrictions:

- Categories: `Manager`, `CEO`
- Coupons: `Manager`, `CEO`
- Contact messages: `Manager`, `CEO`

Some pages also apply internal role checks:

- Users page only allows `CEO`.
- Cloudinary page allows `CEO`, `Manager`, `Admin`.
- Order payment verification editing is CEO-only; Managers can view payment verification.
- Coupon form blocks `Admin`.

## Shared State Conventions

Authentication:

- `adminToken`: JWT used for `Authorization` header.
- `adminData`: JSON profile object, expected to include `role`.

Common local state:

- `loading`: controls page-level loading.
- `saving`: controls form submit state.
- `error`: user-facing error text.
- `validationIssues`: structured backend field errors in newer forms.
- `imageManagerOpen`, `imageManagerImages`, `selectedImageUrls`: Cloudinary picker state in product-like forms.

## Styling Conventions

There is no single design system. Reused style surfaces include:

- `AdminDashboard.css`: dashboard shell/navigation cards.
- `product.css`: product tables, form grids, filter bars, modals, image manager UI.
- `order.css`: order list/detail and payment verification UI.
- `coupon.css`: coupon list/form layouts.
- `brand.css`, `category.css`, `cloudinary.css`, `user.css`: module-specific support.

When adding UI, prefer existing classes before inventing new CSS.

