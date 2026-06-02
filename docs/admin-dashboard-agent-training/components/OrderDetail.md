# OrderDetail

Source: `frontend/M3/src/pages/orders/OrderDetail.jsx`

Route: `/admin/orders/:id`

Purpose:

- View order detail, update status, manage payment verification, and print slip.

Endpoints:

- `GET /order/admin/orders/:id`
- fallback `GET /order/:id`
- `PATCH /order/update-status/:id`
- `PATCH /order/admin/orders/:id/payment-verification`

Special behavior:

- Payment verification editing is CEO-only.
- Payment proof upload uses `XMLHttpRequest` and `FormData`.
- QR code for print slip is generated through dynamic `qrcode` import.

