# Retail Catalog

This file covers brands, categories, and standard retail products.

## Brands

Files:

- `frontend/M3/src/pages/brands/BrandList.jsx`
- `frontend/M3/src/pages/brands/BrandForm.jsx`
- `frontend/M3/src/pages/brands/brand.css`

Routes:

- `/admin/brands`
- `/admin/brands/new`
- `/admin/brands/:id`

Purpose:

- Manage product brands displayed across the store.
- Track active and inactive brands.
- Provide brand imagery for product forms and storefront display.

List endpoints:

- `GET /brand/all`
- `GET /brand/active`
- `DELETE /brand/delete/:id`

Form endpoints:

- `GET /brand/get/:id`
- `POST /brand/add`
- `PATCH /brand/edit/:id`

Important list behavior:

- Has local search query.
- Has view mode for all/active style filtering.
- Tracks image load failures in `imageErrors`.
- Edit button navigates to `/admin/brands/:id`.

Important form behavior:

- Uses `emptyBrand` as shape source.
- Supports create and edit based on `id` route param.
- Sends JSON payload with auth header.
- Navigates back to brand list after save.

## Categories

Files:

- `frontend/M3/src/pages/categories/CategoryList.jsx`
- `frontend/M3/src/pages/categories/CategoryForm.jsx`
- `frontend/M3/src/pages/categories/category.css`

Routes:

- `/admin/categories`
- `/admin/categories/new`
- `/admin/categories/:id`

Route roles:

- `Manager`
- `CEO`

Purpose:

- Manage parent categories and children/subcategories.
- Provide category data used by retail products and accessory forms.

List endpoints:

- `GET /category/all`
- `DELETE /category/delete/:id`

Form endpoints:

- `GET /category/get/:id`
- `POST /category/add`
- `PATCH /category/edit/:id`

Important form behavior:

- Uses `childInput` for adding child category labels.
- Saves parent and children structure.
- Edit mode loads existing category by id.

## Products

Files:

- `frontend/M3/src/pages/products/ProductList.jsx`
- `frontend/M3/src/pages/products/ProductForm.jsx`
- `frontend/M3/src/pages/products/product.css`

Routes:

- `/admin/products`
- `/admin/products/new`
- `/admin/products/:id`

Purpose:

- Manage retail products sold through the storefront.
- Control product content, price, stock, brand/category, images, SEO, featured status, and offer fields.

List endpoints:

- `GET /product/all`
- `DELETE /product/:id`
- `PATCH /product/edit-product/:id`

Form endpoints:

- `GET /product/single-product/:id`
- `GET /brand/all`
- `GET /category/all`
- `GET /cloudinary/images`
- `POST /product/add`
- `PATCH /product/edit-product/:id`

Important product list behavior:

- Loads all products.
- Builds category filter options from product category data.
- Supports selected category filter.
- Tracks broken product images with `imageErrors`.
- Has featured toggle via product edit endpoint.
- Delete uses confirmation before calling backend.

Important product form behavior:

- Loads brands and categories before save.
- Loads product when editing.
- Has Cloudinary image manager modal.
- Supports selecting one image as main or multiple additional images.
- Maintains offer date/time state.
- Normalizes brand/category references into object shapes expected by backend.
- Displays `validationIssues` from backend when available.

Image manager behavior:

- Fetches `GET /cloudinary/images`.
- Query filters images.
- Allows selecting main image or adding multiple images.
- Reused pattern appears in product-like professional modules.

Agent guidance:

- Product payloads are sensitive because the backend accepts legacy and newer shapes.
- Preserve existing normalization helpers when extending fields.
- Do not remove fallback/debug console logs unless cleaning the whole module intentionally.

