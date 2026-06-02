# Admin Dashboard Agent Training

This folder teaches future agents how the NEES Medical admin dashboard works. Use it as the first stop before changing admin behavior.

## Project Identity

- App name: NEES Medical Admin Dashboard
- Local repo: `Admin_Dashboard`
- Frontend app root: `frontend/M3`
- Framework: React 18 + Vite
- Router: `react-router-dom`
- Backend API config: `frontend/M3/src/config/api.js`
- Deployment project: Vercel `admin-dashboard-m3`
- Live URL: `https://admin-dashboard-m3.vercel.app`

## How To Read These Docs

Read in this order for general work:

1. `00-system-map.md`
2. `01-routing-auth-api.md`
3. `02-layout-dashboard.md`
4. The feature file matching your task.

For targeted work:

- Login, route guards, roles: `01-routing-auth-api.md`
- Dashboard metrics/navigation: `02-layout-dashboard.md`
- Products, categories, brands: `03-retail-catalog.md`
- Clinical products, machines, accessories: `04-professional-catalog.md`
- Orders, dispatch, payment proof: `05-orders.md`
- Coupons and affiliate offers: `06-coupons.md`
- Blogs and SEO content: `07-blogs.md`
- Training events and PMDC registration verification: `08-training-events.md`
- Cloudinary image manager: `09-media-cloudinary.md`
- Users, staff, contacts: `10-people-contacts.md`
- Development, deploy, agent guardrails: `11-operations.md`

## Core Mental Model

The admin dashboard is a protected browser app. It stores the admin JWT and admin profile in `localStorage`, checks route access in `ProtectedRoute`, then calls backend endpoints through `API_BASE_URL`.

Most pages follow this pattern:

- Read `adminToken` from `localStorage`.
- Fetch data with `Authorization: Bearer <token>`.
- Keep local loading/error state.
- Render a list page plus a form page.
- Save through REST endpoints.
- Navigate back to the list after successful save.

The app uses a few shared CSS files rather than a formal component library. Many modules reuse product table/form styles from `frontend/M3/src/pages/products/product.css`.

## Important Current State

- Admin dashboard main branch has the bulk PMDC verification feature merged.
- Backend main branch deploy has no Vercel cron block.
- The admin deployment is on `hashamtahir4806-3500` / `hasham-tahirs-projects`, not the backend Vercel account.

