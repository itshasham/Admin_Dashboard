# Media And Cloudinary

## Cloudinary Page

File: `frontend/M3/src/pages/cloudinary/CloudinaryPage.jsx`

Route:

- `/admin/cloudinary`

Purpose:

- Upload images to backend/Cloudinary.
- View image library.
- Search images.
- Copy image URLs.
- Delete images.

Allowed internal roles:

- `CEO`
- `Manager`
- `Admin`

Endpoints:

- `GET /cloudinary/images`
- `POST /cloudinary/add-img`
- `POST /cloudinary/add-multiple-img`
- `DELETE /cloudinary/images/:id`

Important state:

- `singleFile`
- `multiFiles`
- `uploading`
- `errorTitle`
- `errorDetails`
- `images`
- `query`
- `role`

Error handling:

`handleHttpError` gives specific user guidance for:

- 401: login/session issue.
- 403: role/permission issue.
- 413: upload too large.
- 429: rate limit.
- 500+ Cloudinary/env setup issues.

Upload behavior:

- Single upload uses `FormData` with one file.
- Multiple upload uses `FormData` with many files.
- After upload, image list is refreshed so `_id` exists for delete.

Delete behavior:

- Uses image `_id` where possible.
- Confirms before delete.

## Embedded Image Managers

Several forms include their own Cloudinary picker modal instead of importing `CloudinaryPage`:

- `ProductForm`
- `ClinicalProductForm`
- `MachineForm`
- `AccessoryForm`

Shared behavior:

- Fetch `GET /cloudinary/images`.
- Normalize backend image payloads.
- Search by query.
- Select one main image or multiple gallery images.
- Insert selected URLs into the local form state.

Agent guidance:

- If you improve image manager behavior, consider extracting a shared component. Right now the logic is duplicated.
- Be careful with upload field names; backend upload routes expect specific multipart keys.

