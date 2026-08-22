# Coupons

## Coupon List

File: `frontend/M3/src/pages/coupons/CouponList.jsx`

Route:

- `/admin/coupons`

Allowed route roles:

- `Manager`
- `CEO`

Purpose:

- Manage discount and affiliate coupons.
- Show coupon status, type, validity, and affiliate summary.

Common endpoints:

- `GET /coupon`
- `GET /coupon/affiliate-summary?month=YYYY-MM`
- `DELETE /coupon/:id`

Important behavior:

- Reads admin role from `localStorage.adminData`.
- Loads coupons on mount.
- Loads affiliate summary separately.
- Supports navigation to create/edit form.
- Delete confirms before backend call.
- Admin role sees the list as view-only; non-Admin roles can add, edit, and delete.
- Search covers title, coupon code, product type, coupon type, affiliate name, and status.
- Status filter supports all/active/inactive.
- Summary cards show total, active, inactive, expiring soon, and affiliate due.

## Coupon Form

File: `frontend/M3/src/pages/coupons/CouponForm.jsx`

Routes:

- `/admin/coupons/new`
- `/admin/coupons/:id`

Purpose:

- Create/edit discount, product-type, and affiliate coupons.

Endpoints:

- `GET /product/all`
- `GET /coupon/:id`
- `POST /coupon/add`
- `PATCH /coupon/:id`

Important role behavior:

- If role is `Admin`, the form renders an access-denied style response. Coupon management is intended for Manager/CEO.

Important fields:

- `couponType`
- `title`
- `couponCode`
- `discountPercentage`
- `customerDiscountAmount`
- `affiliateCommissionAmount`
- `minimumAmount`
- `affiliateName`
- `affiliateEmail`
- `affiliatePhone`
- `affiliatePaymentDetails`
- `productType`
- `status`
- `startTime`
- `endTime`
- `logo`

Time behavior:

- Form uses datetime-local fields.
- Additional hour/minute state exists for schedule controls.

Preview behavior:

- Coupon preview chips show discount/status style data before save.

Agent guidance:

- Coupon form currently contains some hook/lint debt. Avoid moving hooks conditionally.
- Preserve affiliate fields; they are business-critical for commission tracking.
