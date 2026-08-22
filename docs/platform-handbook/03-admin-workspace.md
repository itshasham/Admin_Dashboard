# 3. Admin Workspace Feature Guide

## 3.1 Purpose

The admin workspace is the protected operating console for NEES Medical. It is a React/Vite single-page application that stores the session token and role profile in browser local storage and calls the backend through a configured API base URL.

## 3.2 Ways to sign in

### Staff login

- Uses admin email and password.
- Stores `adminToken` and `adminData` in local storage.
- Opens the dashboard after successful authentication.
- Supports forgot-password and reset-password flows.

### Guest Quick Entry

- Uses a separate four-digit guest PIN.
- Produces an eight-hour Guest token with a create-only employee scope.
- Redirects directly to the People workspace.
- Renders the restricted Guest Employee Entry screen instead of the full company registry.
- Cannot browse employees, offices, assets, orders, or other company data.

## 3.3 Global navigation

The current admin application registers these main routes:

| Area | Main route | Purpose |
| --- | --- | --- |
| Overview | `/admin/dashboard` | Business metrics and operational navigation |
| Orders | `/admin/orders` | Fulfillment, status, dispatch, and payment review |
| Expenses | `/admin/expenses` | Expense ledger UI and reporting concept |
| Retail | Products, brands, categories, coupons | Consumer catalog and promotions |
| Clinical | Clinical products, machines, accessories | Professional and device catalog |
| People | `/admin/people-assets` | Employees, offices, company assets, and issues |
| Content | Blogs, training events, media | Publishing, events, registrations, Cloudinary |
| WhatsApp | `/admin/whatsapp` | Approved-template marketing campaigns |
| Customers/staff | Users and Staff | Customer visibility and admin-account management |
| Protected utilities | Delete PIN and Map Links | Sensitive settings and private link storage |

The application also exposes a compact mobile dock for the first navigation items available to the active role.

## 3.4 Dashboard

The dashboard is the operational landing page. It:

- Reads the current admin profile and handles logout.
- Fetches orders through current and fallback endpoints.
- Derives order counts, revenue, status totals, recent orders, seven-day sales, product/category demand, and payment mix where the underlying data exists.
- Shows empty states instead of inventing values when no sales data is available.
- Provides navigation cards to the main modules.

Because order APIs evolved over time, the dashboard intentionally keeps fallback endpoint handling.

## 3.5 Module directory

### Products

- List, search, filter, feature/unfeature, edit, and delete retail products.
- Create/edit title, slug, SKU, price, discount, stock, category, brand, copy, media, SEO, and promotional properties.
- Use the embedded Cloudinary image picker for main and gallery images.

### Brands

- Create/edit/delete brands.
- Maintain brand name, image/logo, description, and status.
- Feed brand data into retail, professional, device, and filtering experiences.

### Categories

- Create/edit/delete parent categories and child labels.
- Control product type and visibility status.
- Supply category choices to product and accessory forms.

### Clinical products

- Manage clinic/professional product records.
- Use newer clinical endpoints when available and legacy product endpoints as fallback.
- Preserve inquiry and professional-use behavior.

### Machines

- Manage medical and aesthetic devices.
- Store model, brand, description, availability, contact channels, media, and professional/inquiry flags.
- Drive the public machines showroom and detail pages.

### Accessories

- Manage accessory identity, category, pricing, stock, media, copy, SEO, active/featured/inquiry state.
- Include special quick-add/import behavior for the half-moon-light accessory.

### Orders

- Search and filter the order queue.
- Open complete order detail.
- Update status and dispatch data.
- Review/edit payment verification according to role.
- View and manage payment-proof images.
- Print an order slip with QR reference.
- Permanently delete only through CEO authentication plus secret delete PIN.

### Coupons

- Manage standard and affiliate coupons.
- Control code, validity window, discount, minimum order, eligible product type, customer incentive, affiliate commission, affiliate identity/payment details, and status.
- View affiliate summary and amount-due information.

### Blogs

- Create/edit/delete SEO-oriented blog posts.
- Maintain title, slug, excerpt, content, images, category, tags, FAQ, workflow state, publication visibility, and SEO metadata.

### Training events

- Create/edit/delete public training events.
- Toggle featured and registration-enabled states.
- Define dates, locations, registration deadline/messages, dynamic fields, organizer, media, and SEO.
- Manage registrations, PMDC verification, decisions, exports, and diagnostics.

### Cloudinary media

- Upload single or multiple images.
- Search, browse, copy URLs, and delete media.
- Supply embedded image pickers in product-like forms.

### WhatsApp campaigns

- View configuration and opted-in audience count.
- Enter a Meta-approved template and language.
- Supply up to ten body variables.
- Confirm marketing consent before sending.
- Send to deduplicated opted-in checkout customers, subject to configured batch limit.

### Staff

- View, add, edit, and delete admin/staff accounts.
- Maintain identity, role, status, contact, and profile information.
- Requires careful role governance because staff accounts grant backend access.

### Customers

- Intended as CEO-only customer visibility.
- Attempts current customer/user endpoints, then falls back to orders/contact data and deduplicates by email.
- Supports search, metrics, and CSV export.
- Current backend-route availability is incomplete; see the status guide.

### Contact messages

- Intended to list, search, filter, read, resolve, and delete customer inquiries.
- Current backend-route availability is incomplete; see the status guide.

### People, Places, and Assets

- Employee identity and employment records.
- Office/location registry.
- Company asset registration and custody.
- Asset issue and maintenance records.
- Detailed in the dedicated People/Places/Assets guide.

### Expenses

- A comprehensive frontend exists for expense entry, evidence, approval, reimbursement, advance reconciliation, categories, and reporting.
- Matching expense routes/models are not present in the active backend working copy, so the module is not currently end-to-end.

### Delete PIN

- CEO-only page to check PIN configuration and change the secret delete PIN.
- Requires the current PIN and matching new PIN confirmation.
- The PIN is hashed in the backend database.

### Protected Map Links

- Stores Google Maps links under Family or Private categories.
- Requires staff login plus a separate map-links PIN.
- Supports list, add, filter, open, lock, and delete.
- This is a small protected utility, not a location-tracking system.

## 3.6 Common list workflow

Most list pages follow this pattern:

1. Load token and role.
2. Fetch records and render loading/error/empty states.
3. Search or filter locally or through query parameters.
4. Open the create/edit form.
5. Confirm before destructive actions.
6. Refresh after mutation.

## 3.7 Common form workflow

1. Load dependencies such as categories, brands, offices, or media.
2. Load the existing record when an ID is in the route.
3. Validate required fields before submission.
4. Upload pending files before or with the record.
5. Send JSON or multipart data to the backend.
6. Display structured validation errors.
7. Return to the list after success.

## 3.8 Admin data-handling rules

- Never share admin JWTs, PINs, Cloudinary credentials, PMDC credentials, email credentials, or WhatsApp access tokens.
- Treat customer contact details, employee identity documents, payment proof, expenses, and private links as sensitive.
- Do not bypass role restrictions in the frontend; matching backend authorization is required.
- Do not remove legacy fallback behavior until backend migration is explicitly complete.
- Use the CEO delete-PIN flow for permanent deletion rather than adding local confirmation-only deletion.
