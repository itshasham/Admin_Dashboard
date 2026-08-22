# NEES Medical Group Platform Handbook

Last verified against the local implementation: **2 August 2026**

This documentation explains the complete NEES Medical Group web platform from a business, operator, and technical point of view. It covers the public storefront, professional catalog, Nees Aesthetics clinic website, admin workspace, backend API, People/Places/Assets registry, guest employee entry, orders, content, training events, communications, security, and deployment.

## Documentation map

1. [Platform overview](./01-platform-overview.md) — the overall purpose, system boundaries, architecture, and business flow.
2. [Public websites and customer journeys](./02-public-websites.md) — storefront, professional catalog, checkout, customer accounts, SEO, and the clinic website.
3. [Admin workspace feature guide](./03-admin-workspace.md) — dashboard navigation and every administrative feature area.
4. [People, places, assets, and guest entry](./04-people-places-assets.md) — employee records, offices, company property, custody, maintenance, and restricted data entry.
5. [Commerce, orders, payments, and customers](./05-commerce-orders-payments.md) — order lifecycle, payment verification, coupons, notifications, customer data, and deletion.
6. [Catalog, content, events, and outreach](./06-catalog-content-events.md) — retail products, professional products, devices, accessories, blogs, Cloudinary, training events, PMDC, and WhatsApp.
7. [Security, roles, data, and API reference](./07-security-data-api.md) — access rules, sensitive records, main data entities, API families, and security controls.
8. [Deployment and operating procedures](./08-deployment-operations.md) — environments, Vercel projects, configuration, verification, backup, and incident practices.
9. [Implementation status and roadmap](./09-status-and-roadmap.md) — what is end-to-end, configuration-dependent, incomplete, or awaiting deployment.

## Status language used in this handbook

- **Implemented end-to-end:** a matching UI, mounted backend route, controller, and data model are present in the active working copy.
- **Configuration-dependent:** code exists, but the feature needs external credentials, environment variables, or an external service.
- **UI-only/incomplete:** the admin screen exists, but matching backend routes are not mounted in the active backend working copy.
- **Legacy-compatible:** the feature intentionally supports both current and older endpoints or database models.
- **Local change pending release:** the implementation exists in the current local working tree but may not yet be committed, pushed, or deployed.

## Intended readers

- **CEO and leadership:** use the platform overview, role matrix, security controls, and status/roadmap.
- **Managers and operators:** use the admin, People/Assets, Orders, Events, and operating-procedure guides.
- **Guest data-entry helpers:** use only the Guest Quick Entry section in the People/Assets guide.
- **Developers and future agents:** use the architecture, API/data reference, deployment guide, and code-source references.

## Important scope note

This handbook documents the source code currently present in `/Users/macuser/Desktop/MEDICAL_WEBSITE`. Production may temporarily differ when local work has not been deployed. The status guide records those known differences. No passwords, PIN values, access tokens, or service credentials are included in this documentation.
