# CouponList

Source: `frontend/M3/src/pages/coupons/CouponList.jsx`

Route: `/admin/coupons`

Purpose:

- List coupons, filter offers, and display affiliate payout summary.

Endpoints:

- `GET /coupon`
- `GET /coupon/affiliate-summary?month=YYYY-MM`
- `DELETE /coupon/:id`

State:

- `coupons`
- `loading`
- `error`
- `query`
- `statusFilter`
- `summaryMonth`
- `affiliateSummary`
- `role`

