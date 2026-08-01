# 9. Implementation Status and Roadmap

## 9.1 Status summary

This status is based on the local working copy reviewed on 2 August 2026. It is not a guarantee that every local change is already deployed.

| Feature | Status | Notes |
| --- | --- | --- |
| Public storefront and retail catalog | Implemented end-to-end | Uses shared product/category/brand APIs |
| Cart, checkout, orders | Implemented end-to-end | Current and legacy order compatibility |
| Payment verification | Implemented end-to-end | Policy mismatch: backend permits Manager; UI edit is CEO-oriented |
| Coupons and affiliates | Implemented, hardening needed | Backend router authorization should be reviewed |
| Professional catalog | Implemented with fallback | Clinical admin uses legacy product fallback |
| Machines and accessories | Implemented end-to-end | Includes inquiry and quick-add behavior |
| Blogs and SEO content | Implemented end-to-end | Includes static/legacy content alongside backend posts |
| Training events and PMDC | Implemented, configuration-dependent | External PMDC availability affects verification |
| Cloudinary media | Implemented, configuration-dependent | Requires Cloudinary credentials |
| Email notifications | Implemented, configuration-dependent | Requires SMTP/service configuration |
| WhatsApp notifications/campaigns | Implemented, configuration-dependent | Requires Meta configuration and feature flags |
| People, Offices, Assets, Issues | Implemented end-to-end | Manager/CEO registry |
| Guest Quick Entry | Implemented locally, release status must be checked | Latest field rules may still need commit/deploy |
| CEO secret delete PIN | Implemented end-to-end | Global guard protects DELETE operations |
| Protected Map Links | Implemented, security redesign recommended | Shared browser/header PIN is a weak extra gate |
| Clinic website | Implemented standalone | Marketing/contact site, no patient record integration |
| Expense management | UI-only/incomplete | Full frontend exists; active backend has no mounted expense API/models |
| Admin Customer list | Partial/incomplete | Expected customer endpoints are not mounted; fallback data may work |
| Contact-message admin | UI-only/incomplete | Expected contact endpoints are not mounted in active backend |
| ReadOnly role | Incomplete | Frontend concept absent from backend Admin enum |

## 9.2 Recent feature set

The newest operational additions represented in the current working copy are:

- People, Places, and Company Assets registry.
- Employee onboarding with identity and document controls.
- Asset custody, return, transfer, and maintenance history.
- Guest Quick Entry for employee Draft submission.
- Separate CEO secret delete PIN for permanent deletion.
- Protected map-link utility.
- WhatsApp campaign console for opted-in customers.
- Detailed expense-management frontend concept.
- Expanded payment verification and proof handling.
- Advanced PMDC verification, diagnostics, bulk processing, and exports.
- Extensive storefront SEO/content hubs and a redesigned clinic site.

## 9.3 Local changes awaiting release confirmation

The latest Guest Quick Entry refinement exists in the local source and has passed targeted backend tests, frontend lint, and a production build. It changes Guest Mode so that:

- Joining Date is hidden and stripped from Guest submission.
- Employment Contract is hidden, stripped, and blocked as a Guest upload.
- Utility Bill proof is mandatory in both frontend and Guest backend validation.
- All other visible identity, employment, emergency-contact, and CNIC fields are mandatory.
- CEO/Manager forms retain Joining Date and Employment Contract.

Before claiming this behavior is live, confirm it has been committed, pushed, and deployed in both the admin and backend projects.

## 9.4 Priority roadmap

### Priority 0 — security and authorization

1. Protect every mutation route with `verifyToken` and explicit roles.
2. Disable public role-selecting admin registration; replace it with CEO invitation or controlled staff creation.
3. Align role names and capabilities across Admin model, frontend navigation, route guards, and backend allowlists.
4. Replace the Map Links shared browser PIN with server-managed hashed authorization if the content is genuinely sensitive.
5. Move Guest login rate limiting to a shared store suitable for serverless production.

### Priority 1 — complete broken frontend/backend contracts

1. Build and mount the Expense, Expense Category, evidence, approval, report, and audit backend.
2. Add supported customer-list endpoints or simplify the admin Customer page around dependable sources.
3. Add the contact-message backend or remove/disable the incomplete admin route until ready.
4. Decide whether clinical products require a dedicated backend resource or should permanently use the shared Product model.

### Priority 2 — policy consistency

1. Decide whether Managers may edit payment verification; make frontend and backend match.
2. Add a CEO-controlled method to rotate the Guest PIN.
3. Define retention rules for employee documents, payment proof, event exports, and deleted records.
4. Define the correct relationship between employee transfers and assigned assets.

### Priority 3 — maintainability

1. Create a shared authenticated API client for the admin workspace.
2. Extract duplicated Cloudinary picker/upload logic.
3. Standardize response and error formats across legacy/current controllers.
4. Remove stale aliases and deployment URLs after production verification.
5. Expand automated integration tests for authorization, order totals, asset custody, and event workflows.

## 9.5 Release acceptance checklist

A feature should be marked end-to-end only when all are true:

- UI route exists and is role-appropriate.
- Backend route is mounted in `index.js`.
- Authentication and authorization are enforced server-side.
- Controller validation exists.
- Model/storage exists.
- Loading, error, empty, and success states are handled.
- Targeted tests pass.
- Production build passes.
- Required environment variables are configured.
- Backend and dependent frontend are deployed.
- Production smoke test confirms the actual workflow.
