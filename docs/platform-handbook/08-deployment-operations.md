# 8. Deployment and Operating Procedures

## 8.1 Deployment inventory

The local Vercel links identify four primary projects:

| Application | Vercel project | Build/runtime |
| --- | --- | --- |
| Storefront | `nees-frontend` | Next.js build |
| Admin workspace | `nees-admin-dashboard` | Vite build from `frontend/M3`, static SPA rewrite |
| Backend API | `nees-backend-api` | Express app through Vercel Node function |
| Clinic website | `clinic-website` | Next.js build |

Observed production-facing addresses include the NEES Medical primary domain, the Nees Aesthetics domain, the admin Vercel alias, and the backend API alias configured in frontend source. Confirm aliases in the Vercel project before each release because documentation and historic source contain older aliases.

## 8.2 Application build behavior

### Storefront

- Install dependencies in `frontend`.
- Required public API base: `NEXT_PUBLIC_API_BASE_URL`.
- Build command: `npm run build`.
- Vercel config defines caching headers and a 30-second limit for local Next.js API routes.

### Admin workspace

- Root Vercel config installs/builds `Admin_Dashboard/frontend/M3`.
- Build command: `npm --prefix frontend/M3 run build`.
- Output: `frontend/M3/dist`.
- All routes rewrite to `index.html` for SPA refresh support.
- API base is selected through `VITE_API_BASE_URL`, local development settings, or the configured remote default.

### Backend API

- Entry point: `Backend_ok/index.js`.
- Vercel routes all requests to the Express entry point.
- The app establishes/reuses a MongoDB connection for requests.
- In local development it starts a listener; under Vercel it exports the app.

### Clinic website

- Next.js App Router project.
- Build command: `npm run build`.
- Uses Next.js metadata, sitemap, and robots generation.
- Most content is maintained in `src/content/site.ts`.

## 8.3 Environment-variable groups

Never place secret values in documentation, screenshots, commits, or frontend environment variables.

### Core backend

- Runtime port/environment.
- MongoDB connection URI.
- JWT and email-verification secrets.
- Storefront, admin, and backend public URLs.

### Email

- Email service or SMTP host/port.
- Sending username/address and password.
- Feature flags and notification recipients/roles.

### Cloudinary

- Cloud name.
- API key and secret.
- Optional upload preset.

### Payments

- Stripe secret key.

### WhatsApp

- Enabled flags.
- Cloud API access token.
- Phone-number ID and API version.
- Default country code.
- Order/event template names.
- Internal notification numbers.
- Campaign limit and delay.

### PMDC

- PMDC endpoint, access configuration, timeouts, queue/retry settings, and optional cron authorization.

### Security controls

- Map Links PIN override.
- PIN hashes themselves are stored in MongoDB and are not environment variables in the current implementation.

### Frontends

- Storefront: `NEXT_PUBLIC_API_BASE_URL` and verified Google Business/review URLs when available.
- Admin: `VITE_API_BASE_URL`, `VITE_LOCAL_API_BASE_URL`, `VITE_USE_REMOTE_API_IN_DEV`, and the current legacy map-PIN setting.

## 8.4 Local development

### Backend

```bash
cd /Users/macuser/Desktop/MEDICAL_WEBSITE/Backend_ok
npm install
npm run dev
```

### Admin

```bash
cd /Users/macuser/Desktop/MEDICAL_WEBSITE/Admin_Dashboard/frontend/M3
npm install
npm run dev
```

### Storefront

```bash
cd /Users/macuser/Desktop/MEDICAL_WEBSITE/frontend
npm install
npm run dev
```

The configured storefront development port is 5090. The admin uses the normal Vite development port unless overridden. The admin local API default currently targets port 3030, so backend and frontend local settings must agree.

### Clinic website

```bash
cd /Users/macuser/Desktop/MEDICAL_WEBSITE/CLININC_FRONTEND
npm install
npm run dev
```

## 8.5 Pre-release checklist

1. Confirm the intended repository, branch, and deployment project.
2. Review `git status` and exclude unrelated/user work.
3. Confirm environment variables exist in the correct Vercel project.
4. Confirm frontend API URL points to the intended backend.
5. Run targeted tests for the changed feature.
6. Run the relevant production build.
7. Review role restrictions and backend authorization.
8. Verify database migrations/default-setting behavior is safe.
9. Commit only the intended source and documentation.
10. Push the intended branch.
11. Deploy the backend before a frontend that depends on a new endpoint.
12. Deploy the frontend/admin/clinic application.
13. Confirm Vercel reports Ready and verify the production alias.
14. Perform a small smoke test in production.

## 8.6 Feature verification examples

### Guest employee entry

- Guest login accepts the configured PIN and rejects invalid attempts.
- Guest is redirected to People Quick Entry.
- Guest cannot open orders, assets, offices, staff, or customers.
- Joining Date and Contract Document do not appear.
- Utility Bill proof and every visible field are mandatory.
- Submission saves a Draft.
- Manager/CEO can later review the draft in the full registry.

### Delete PIN

- Non-CEO DELETE fails.
- CEO DELETE without a PIN fails.
- Incorrect PIN fails.
- Correct delete PIN permits the authorized deletion.
- CEO can change the PIN through the security page.

### Orders

- Checkout creates an order with correct totals.
- Admin queue displays it.
- Processing/Dispatch validation works.
- Payment proof is required for verified online payment.
- Public detail does not expose internal verification data.

### People and assets

- Office can be created.
- Employee and asset codes/tags remain unique.
- Asset cannot be assigned twice.
- Asset return updates custody history.
- Assigned asset cannot be deleted or office-transferred.
- Employee with assigned assets cannot be deleted.

### Training events

- Public event listing/detail loads.
- Registration respects enabled/deadline state.
- PMDC workflow records state and retry information.
- Admin approval/rejection and exports work.

## 8.7 Monitoring and incident response

### What to monitor

- Vercel function/build failures.
- MongoDB connection and query errors.
- Order creation and notification failures.
- Cloudinary upload/access failures.
- PMDC queue backlog, failed verification, and stale locks.
- WhatsApp configuration and campaign failures.
- Repeated authentication/PIN failures.
- Frontend calls to missing/unmounted endpoints.

### First response

1. Identify whether the failure is frontend, backend, database, or external service.
2. Preserve the failing request/response without exposing sensitive values.
3. Check the relevant Vercel deployment and logs.
4. Confirm environment configuration and service status.
5. Reproduce with the smallest read-only or reversible test.
6. Roll back the deployment if a recent release caused the failure.

## 8.8 Backup and retention expectations

- MongoDB backup/retention should be configured outside application code.
- Cloudinary retention must account for media referenced by historical orders and records.
- Deletion is permanent from the application’s perspective; there is no application recycle bin.
- Audit/history arrays are operational records, not a substitute for database backup.
- Exported registration and customer data must be stored and shared securely.
