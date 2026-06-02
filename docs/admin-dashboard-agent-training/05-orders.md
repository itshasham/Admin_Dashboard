# Orders

## Order List

File: `frontend/M3/src/pages/orders/OrderList.jsx`

Route:

- `/admin/orders`

Purpose:

- Show operational order queue.
- Support search and status filtering.
- Navigate to order detail.

Endpoints:

- Primary: `GET /order/admin/orders`
- Fallback: `GET /order/orders`
- Secondary fallback: `GET /user-order/dashboard-recent-order`

Important state:

- `orders`
- `loading`
- `error`
- `errorDebug`
- `query`
- `statusFilter`
- `role`

Important behavior:

- Reads role from `localStorage.adminData`.
- Tries multiple endpoints because order APIs have changed over time.
- Normalizes order records for table display.
- Search/filter is client-side over fetched order data.
- Detail button navigates to `/admin/orders/:id`.

## Order Detail

File: `frontend/M3/src/pages/orders/OrderDetail.jsx`

Route:

- `/admin/orders/:id`

Purpose:

- Inspect complete order information.
- Update order status.
- View and update payment verification.
- Print or open order slip.

Load endpoints:

- Primary: `GET /order/admin/orders/:id`
- Fallback: `GET /order/:id`

Status update endpoint:

- `PATCH /order/update-status/:id`

Payment verification endpoint:

- `PATCH /order/admin/orders/:id/payment-verification`

Important role behavior:

- `CEO`, `Manager`, and `Admin` can access order detail.
- Payment verification can be viewed by `CEO` and `Manager`.
- Payment verification can be edited only by `CEO`.

Status behavior:

- Status options are derived from current order status.
- Dispatch-related transitions are guarded.
- Status payload is sent to backend and local order state is updated after success.

Payment verification behavior:

- Supports status values such as pending/verified.
- When marking verified, requires:
  - received method
  - received location/account
  - amount received
  - proof image if payment method is online
- Supports multiple proof images.
- Allows drag/drop, paste, file picker, remove, and reorder.
- Uses `XMLHttpRequest` for upload progress because files are sent as `FormData`.
- Preserves existing proof images by sending `existingProofImageKeys`.
- Appends new files under `paymentProofImages`.

Payment proof UI:

- Read-only grid for existing backend proof images.
- Editable proof gallery for current form state.
- Preview modal for image inspection.
- Progress bar during upload.

Print slip behavior:

- Dynamically imports `qrcode`.
- Generates QR data URL for order id.
- Opens printable HTML slip.

Agent guidance:

- Do not simplify payment verification to JSON; it intentionally uses multipart upload.
- Do not make payment verification editable by non-CEO roles without explicit approval.
- Keep fallback load endpoints because order detail supports legacy and current backend shapes.

