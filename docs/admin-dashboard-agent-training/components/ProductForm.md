# ProductForm

Source: `frontend/M3/src/pages/products/ProductForm.jsx`

Routes:

- `/admin/products/new`
- `/admin/products/:id`

Purpose:

- Create/edit retail product content, pricing, media, SEO, and offer data.

Endpoints:

- `GET /brand/all`
- `GET /category/all`
- `GET /product/single-product/:id`
- `GET /cloudinary/images`
- `POST /product/add`
- `PATCH /product/edit-product/:id`

State:

- `product`
- `offerStart`
- `offerEnd`
- `saving`
- `error`
- `validationIssues`
- `brands`
- `categories`
- image manager state

Behavior:

- Supports Cloudinary main/additional image selection.
- Normalizes brand/category data before save.

