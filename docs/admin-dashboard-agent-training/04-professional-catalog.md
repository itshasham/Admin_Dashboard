# Professional Catalog

This file covers clinical products, machines, and accessories. These modules support B2B/professional-use catalog areas, not only ordinary retail products.

## Clinical Products

Files:

- `frontend/M3/src/pages/clinical-products/ClinicalProductList.jsx`
- `frontend/M3/src/pages/clinical-products/ClinicalProductForm.jsx`

Routes:

- `/admin/clinical-products`
- `/admin/clinical-products/new`
- `/admin/clinical-products/:id`

Purpose:

- Manage professional or clinic-facing products.
- Supports fallback to legacy product endpoints when newer clinical endpoints are unavailable.

List endpoints:

- Primary: `GET /clinical-products`
- Fallback: `GET /product/all`
- Delete primary: `DELETE /clinical-products/:id`
- Delete fallback: `DELETE /product/:id`

Form endpoints:

- Primary load: `GET /clinical-products/:id`
- Fallback load: `GET /product/single-product/:id`
- Brands: `GET /brand/all`
- Image manager: `GET /cloudinary/images`
- Primary create/update: `POST /clinical-products`, `PATCH /clinical-products/:id`
- Fallback create/update: `POST /product/add`, `PATCH /product/edit-product/:id`

Important behavior:

- Uses `CLINICAL_CATEGORY_OPTIONS` inside the form.
- Has Cloudinary image manager for main/additional images.
- Tracks `validationIssues`.
- Falls back to product endpoints if clinical endpoint returns failure.

Agent guidance:

- Be careful when changing field names; this module bridges newer clinical-product data and legacy product data.
- Preserve fallback behavior unless the backend migration is complete.

## Machines

Files:

- `frontend/M3/src/pages/machines/MachineList.jsx`
- `frontend/M3/src/pages/machines/MachineForm.jsx`

Routes:

- `/admin/machines`
- `/admin/machines/new`
- `/admin/machines/:id`

Purpose:

- Manage medical/aesthetic device listings.
- Listings are generally inquiry-focused rather than direct checkout products.

List endpoints:

- `GET /machines`
- `DELETE /machines/:id`

Form endpoints:

- `GET /brand/all`
- `GET /machines/:id`
- `GET /cloudinary/images`
- `POST /machines`
- `PATCH /machines/:id`

Important machine fields:

- `name`
- `modelNumber`
- `brand`
- `productUrl`
- `description`
- `availability`
- `contactEmail`
- `whatsappNumber`
- `inquiryOnly`
- `professionalUseOnly`
- `isActive`
- Images and media

Important behavior:

- Brand selection maps selected brand details into the machine state.
- Cloudinary image manager supports multi-select.
- Save errors distinguish 401, 403, and general backend validation failures.

## Accessories

Files:

- `frontend/M3/src/pages/accessories/AccessoryList.jsx`
- `frontend/M3/src/pages/accessories/AccessoryForm.jsx`

Routes:

- `/admin/accessories`
- `/admin/accessories/new`
- `/admin/accessories/:id`

Purpose:

- Manage accessory catalog items that supplement products/devices.
- Supports parent category filtering and featured toggling.

List endpoints:

- `GET /accessories`
- `DELETE /accessories/:id`
- `PATCH /accessories/:id`
- `POST /accessories/quick-add-half-moon-light`

Form endpoints:

- `GET /category/all`
- `GET /accessories/:id`
- `GET /cloudinary/images`
- `POST /accessories`
- `PATCH /accessories/:id`

Important list behavior:

- `selectedParent` filters accessories by parent category.
- `featureSavingIds` tracks per-row featured toggle saves.
- `quickAddLoading` supports the half-moon-light quick-add flow.
- `autoImportAttempted` prevents repeated automatic import attempts.

Important form behavior:

- Loads categories for category selection.
- Supports image and video URL arrays.
- Uses Cloudinary image manager.
- Validates required fields before save.
- Navigates back to `/admin/accessories` after save.

Agent guidance:

- The accessory module has special business behavior for half moon light import/quick-add. Do not remove it as dead code without checking backend and product requirements.

