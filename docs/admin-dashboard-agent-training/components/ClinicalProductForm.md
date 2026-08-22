# ClinicalProductForm

Source: `frontend/M3/src/pages/clinical-products/ClinicalProductForm.jsx`

Routes:

- `/admin/clinical-products/new`
- `/admin/clinical-products/:id`

Purpose:

- Create/edit clinical product records.

Endpoints:

- `GET /brand/all`
- `GET /clinical-products/:id`
- fallback `GET /product/single-product/:id`
- `GET /cloudinary/images`
- `POST /clinical-products`
- `PATCH /clinical-products/:id`
- fallback `POST /product/add`
- fallback `PATCH /product/edit-product/:id`

State:

- `item`
- `brands`
- `loading`
- `saving`
- `validationIssues`
- image manager state

