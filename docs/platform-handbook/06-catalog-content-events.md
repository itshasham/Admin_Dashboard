# 6. Catalog, Content, Events, and Outreach

## 6.1 Retail catalog

### Products

Product records support:

- Title/name, stable slug, SKU, description, and detailed content.
- Parent/child category and embedded brand reference.
- Price, discount, quantity, and inventory state.
- Main image, additional images, and video URLs.
- Featured and promotional state.
- BOGO configuration.
- SEO title, description, canonical URL, and keywords.
- Sales and review-related metrics.

Admin users can create, edit, search, filter, feature, and delete products. The storefront reads product groups for home, shop, related, offer, popular, top-rated, keyword, and detail pages.

### Brands

Brands provide a reusable identity across retail and professional listings. Core data includes name, logo, description, and status.

### Categories

Categories provide a parent/children hierarchy, product type, description, and Show/Hide status. They drive navigation and form choices.

## 6.2 Professional catalog

### Clinical products

The admin clinical-product module uses newer clinical endpoints when available and falls back to the shared product model/endpoints. This allows professional pages to continue operating during backend migration.

Professional records may carry:

- Clinic-use categorization.
- Professional-use-only state.
- Inquiry-only state.
- Clinical/educational copy.
- Media and SEO metadata.

### Machines and devices

Machine records contain:

- Name and model number.
- Brand and optional product URL.
- Required description.
- Available, out-of-stock, or discontinued state.
- Multiple images.
- Contact email and WhatsApp number.
- Inquiry-only, professional-use-only, active, and featured flags.

The public device showroom and detail pages use this data to support professional inquiries.

### Accessories

Accessory records support:

- Title, slug, SKU, and unit.
- Required category hierarchy.
- Price, discount, and quantity.
- Brand, media, details, description, and badges.
- SEO fields.
- Featured, inquiry-only, active, and source/import metadata.

The module contains dedicated quick-add/import behavior for the half-moon-light product and should not be removed as unused without confirming the catalog strategy.

## 6.3 Media and Cloudinary

Cloudinary is the shared media store for:

- Product, brand, machine, accessory, blog, and event images.
- Employee profile photographs.
- Private employee identity/support documents.
- Asset photographs and supporting documents.
- Order payment proof.

### Admin media library

- Upload one or multiple images.
- Search the library.
- Copy an image URL.
- Delete a managed image.
- Refresh after upload so the database-backed media ID is available.

### Private versus public media

- Catalog and marketing images are generally public delivery assets.
- Employee identity documents are stored as authenticated/private Cloudinary resources.
- Private document access is requested through an authorized backend endpoint that creates a short-lived or signed access path when possible.

## 6.4 Blogs and editorial content

Blog records contain:

- Title, slug, excerpt, content, category, and tags.
- Featured image and gallery.
- FAQ content.
- SEO title, description, canonical, and keywords.
- Workflow status: draft, review, approved, scheduled, or published.
- Public active state.
- Optional prompt/generation history.
- View count.

Public blog routes combine backend content with some legacy/static content. Slugs and canonical URLs are business assets and should not be changed casually.

## 6.5 Search and content strategy

The storefront includes:

- Retail keyword landing pages.
- Professional keyword landing pages.
- Product-family hubs.
- Comparison guides.
- Brand/product-specific landing pages.
- Lahore and Pakistan local-intent pages.
- Editorial and trust policies.
- Structured data and dynamic sitemap coverage.

Every indexable page should have a distinct purpose, matching content, a canonical URL, and a route that returns useful data. Unsupported keyword permutations should remain out of the sitemap.

## 6.6 Training events

### Event content

An event can include:

- Title and unique slug.
- Short and full descriptions.
- Type, date, time, city, location, venue address, and map location.
- Organizer.
- Cover image and gallery.
- Dynamic registration fields and validations.
- Registration enabled state.
- Registration deadline.
- Closed/unavailable messages.
- Featured and active state.
- SEO metadata.

### Public registration

- The visitor opens an active event.
- Registration availability and deadline are evaluated.
- Required fixed and dynamic fields are validated.
- PMDC number can be checked before submission.
- Duplicate identity constraints protect a single event from repeated PMDC/CNIC registration where configured.
- A registration reference is generated.

### Registration data

Typical data includes doctor name, PMDC number, CNIC, phone, email, clinic, city, specialization, custom responses, registration status, approval status, verification state, retry counts, timing, lock state, error details, and verification logs.

## 6.7 PMDC verification

PMDC is one of the most operationally complex integrations.

### Verification states

- Pending.
- Processing.
- Verified.
- Unverified.
- Manual review.
- Retry pending.
- Failed.

### Verification methods

- Server-side PMDC service.
- Direct browser lookup where the external portal and CORS permit it.
- Browser result saved back to the backend.
- Server retry fallback when browser lookup cannot complete.

### Queue safeguards

- Retry counters and next-retry timestamps.
- Processing locks and stale-lock recovery.
- Process-level state record.
- Manual reset and diagnostics.
- Sequential bulk processing in the admin interface to avoid flooding the external service.

### Admin registration actions

- Search/filter by event, city, status, PMDC state, and date.
- Select individual or filtered rows.
- Verify selected PMDC records.
- Retry one record.
- Approve or reject, with reason where applicable.
- View PMDC diagnostics/connectivity.
- Export CSV, XLSX, or PDF.
- Delete with CEO/PIN protection under the global deletion policy.

## 6.8 WhatsApp outreach

WhatsApp uses Meta’s Cloud API and is configuration-dependent.

### Transactional notifications

- Internal new-order message.
- Customer order-received message.
- Event approval/rejection message.

### Marketing campaigns

- Available to CEO and Manager.
- Audience comes only from orders with explicit WhatsApp marketing opt-in.
- Phone numbers are normalized and deduplicated.
- Messages use a Meta-approved template.
- Template language and up to ten body parameters are supplied by the operator.
- The operator must confirm opt-in before send.
- A configurable batch limit and inter-message delay reduce accidental over-send.
- Results show attempted, sent, failed, and truncated counts.

## 6.9 Content and outreach operating rules

- Do not publish medical claims that are unsupported by product/manufacturer evidence.
- Keep professional-use and inquiry-only flags aligned with how an item may be sold.
- Preserve consent boundaries for marketing.
- Never use an unapproved WhatsApp marketing template.
- Keep PMDC fallback and diagnostics because the external portal can be unavailable.
- Treat media deletion as a dependency change; confirm no live page or record references the asset.
