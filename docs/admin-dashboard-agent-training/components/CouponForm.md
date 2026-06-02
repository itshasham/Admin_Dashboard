# CouponForm

Source: `frontend/M3/src/pages/coupons/CouponForm.jsx`

Routes:

- `/admin/coupons/new`
- `/admin/coupons/:id`

Purpose:

- Create/edit timed discounts and affiliate coupons.

Endpoints:

- `GET /product/all`
- `GET /coupon/:id`
- `POST /coupon/add`
- `PATCH /coupon/:id`

State:

- `coupon`
- `saving`
- `error`
- `productTypes`
- `role`
- start/end hour-minute helper state

