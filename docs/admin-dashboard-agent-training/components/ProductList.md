# ProductList

Source: `frontend/M3/src/pages/products/ProductList.jsx`

Route: `/admin/products`

Purpose:

- Manage standard retail products.

Endpoints:

- `GET /product/all`
- `DELETE /product/:id`
- `PATCH /product/edit-product/:id`

State:

- `products`
- `selectedCategory`
- `loading`
- `error`
- `imageErrors`
- `featureSavingIds`

Behavior:

- Category filter is built from loaded products.
- Featured toggle updates through edit endpoint.

