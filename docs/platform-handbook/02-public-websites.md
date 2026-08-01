# 2. Public Websites and Customer Journeys

## 2.1 NEES Medical storefront

The main storefront is the public commercial and educational surface for NEES Medical. It combines ordinary ecommerce with inquiry-led professional products.

### Main navigation

- **Home:** skincare-focused landing page, featured offers, categories, products, accessories, training highlight, testimonials, blogs, and priority SEO paths.
- **Shop:** searchable and filterable retail catalog.
- **Machines:** medical and aesthetic device showroom.
- **For Clinics:** professional clinical catalog and category paths.
- **Blogs:** educational and SEO content.
- **Support:** About, Contact, Shipping & Returns, Editorial Standards, Coupons, and Training Events.

### Homepage responsibilities

The homepage is assembled from live or server-fetched data where available. It includes:

- Hero and campaign messaging.
- Featured BOGO or promotional offer.
- Category discovery.
- Retail product listings.
- Accessories preview.
- Featured training event.
- Brand/product gateways.
- Testimonials and trust content.
- Latest blogs.
- High-priority internal links for Pakistani retail and clinical search topics.

### Retail catalog

Retail product experiences include:

- Product listing and category filtering.
- Search by product text and supported metadata.
- Brand, category, price, color, rating, availability, and sale-oriented filters where the relevant data is available.
- Product detail by stable slug and a legacy detail route by database ID.
- Quantity selection, cart, wishlist, comparison, quick view, and related products.
- Pricing helpers for discount and promotional display.
- Product reviews and rating display.
- BOGO-aware product presentation where configured.

### Professional catalog

Professional pages separate clinic-oriented supply from ordinary consumer shopping. They support:

- Professional product list and detail pages.
- Category and keyword landing pages.
- Medical-device list and device detail pages.
- Professional-use disclaimers.
- Trust and evidence sections.
- Inquiry-first calls to action.
- Request pricing, request quote, proposal, demo, contact-sales, and WhatsApp paths.

Products can carry flags such as inquiry-only or professional-use-only. These flags should prevent an unsuitable product from being treated as an ordinary retail checkout item.

## 2.2 Shopping tools

### Cart

The cart stores selected products and quantities in frontend state. It calculates line totals, discounts, and the subtotal before checkout. Cart data is included as an order snapshot so later product edits do not rewrite the historical order.

### Wishlist

Wishlist allows the visitor to save products for later. It is a customer convenience feature and is separate from the confirmed order record.

### Compare

Compare provides a side-by-side product review surface using the selected product records.

### Coupons

Public coupons can be discovered on the coupon page and applied during checkout. The backend remains responsible for final coupon validation, including status, time window, minimum amount, eligible product type, and affiliate rules.

## 2.3 Checkout and order creation

The checkout collects buyer, delivery, payment, and optional marketing information. The backend then:

1. Normalizes guest versus authenticated-user data.
2. Recalculates coupon effects against eligible cart items.
3. Stores product snapshots and money fields.
4. Creates the order in the current order collection.
5. Sends customer and staff email if enabled/configured.
6. Sends staff/customer WhatsApp notifications if enabled/configured.

Checkout supports a Stripe payment-intent endpoint, while the wider order flow also supports offline/COD-style methods represented by the order payment fields.

The public order-detail endpoint deliberately removes internal payment-verification, affiliate, and audit information.

## 2.4 Customer accounts

Customer features include:

- Registration and email verification.
- Login.
- Forgot/reset password.
- Password change.
- Profile update.
- Authenticated order history.
- Individual order detail.

The storefront stores user session information in a browser cookie and adds the bearer token to backend calls through the shared Redux API layer.

Private pages such as Profile and Checkout are marked no-index where appropriate so search engines do not treat account or transactional pages as public content.

## 2.5 Content and SEO system

The storefront has a substantial search-growth layer:

- Product and professional keyword pages.
- Product-family hubs and comparison guides.
- Dedicated landing pages for important brands/products/topics.
- Blog list and detail pages.
- Canonical URL generation.
- SEO title and description overrides.
- Structured data for organization, website, products, breadcrumbs, FAQs, and item lists where implemented.
- Dynamic sitemap generation from product, accessory, blog, event, and static-route data.
- Robots controls and no-index rules for low-value or transactional routes.
- Editorial policy and trust/evidence content.
- Local SEO material for Lahore and Pakistan-focused searches.

SEO pages should exist only when they have meaningful content and matching products or services. Placeholder, duplicate, ID-only, or unsupported keyword URLs should not be promoted into the sitemap.

## 2.6 Training-event public experience

Public event pages provide:

- Event listing and featured-event discovery.
- Event date, time, city, venue, organizer, media, and descriptions.
- Registration open/closed behavior and deadline messaging.
- Dynamic registration fields.
- PMDC number pre-validation.
- Registration submission and status messages.

The admin and backend event workflow is documented in the catalog/content/events guide.

## 2.7 Customer support and inquiry surfaces

The storefront includes:

- About NEES Medical.
- Contact page and contact form.
- Shipping and returns information.
- Editorial policy.
- Quote, pricing, proposal, demo, and sales-contact pages.
- Floating and inline WhatsApp actions.
- Clinic/professional disclaimers and trust content.

The contact form expects a backend contact endpoint. That endpoint is not mounted in the active backend working copy, so this integration is listed as incomplete in the status guide.

## 2.8 Nees Aesthetics clinic website

The clinic website is a separate Next.js application for **Nees Aesthetics, Laser & Skin Clinic** in DHA Lahore.

### Public pages

- `/` — clinic positioning, interactive hero, services, experience pillars, patient journey, testimonials, FAQs, and contact actions.
- `/services` — detailed service-category presentation.
- `/about` — clinic identity, approach, and experience.
- `/contact` — phone, email, WhatsApp, address, map, and operating hours.

### Service pillars

- Skin care treatments.
- Laser treatments.
- Skin consultations.
- Hair treatments.
- Cosmetic treatments.

### Patient journey

1. Consultation.
2. Assessment and suitability review.
3. Treatment plan and pacing.
4. Aftercare and maintenance guidance.

### Clinic-site characteristics

- Content is primarily maintained in `src/content/site.ts`.
- Metadata, Open Graph, Twitter metadata, robots, sitemap, organization/clinic schema, and website schema are generated in the Next.js app.
- The site directs visitors toward WhatsApp, phone, email, map, and contact actions rather than an online clinical-booking database.
- The site does not currently share account, appointment, or patient-record data with the main backend.

## 2.9 Public route reference

| Area | Representative routes |
| --- | --- |
| Retail | `/`, `/shop`, `/product/[slug]`, `/accessories`, `/accessory/[slug]` |
| Professional | `/professional`, `/professional/[id]`, `/medical-devices`, `/medical-devices/[slug]` |
| Shopping | `/cart`, `/wishlist`, `/compare`, `/checkout`, `/coupon` |
| Customer account | `/login`, `/register`, `/forgot`, `/profile`, `/order/[id]` |
| Events | `/training-events`, `/training-events/[slug]` |
| Content | `/blog`, `/blog/[slug]`, comparison and product-family landing pages |
| Support/inquiry | `/about`, `/contact`, `/shipping-returns`, `/request-quote`, `/request-pricing`, `/request-proposal`, `/book-demo`, `/contact-sales` |
| Search infrastructure | `/search`, `/sitemap.xml`, robots file |
