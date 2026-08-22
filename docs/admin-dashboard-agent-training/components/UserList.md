# UserList

Source: `frontend/M3/src/pages/users/UserList.jsx`

Route: `/admin/users`

Purpose:

- Show customer/user records.

Role:

- CEO-only inside the component.

Endpoints:

- `GET /admin/customers?page=1&limit=200`
- fallback `GET /admin/users?page=1&limit=200`
- fallback order sources: `GET /order/admin/orders`, `GET /order/orders`, and `GET /user-order/dashboard-recent-order`
- fallback contact source: `GET /contact-us?page=1&limit=200`

State:

- `users`
- `loading`
- `error`
- `notice`
- `role`
- `query`

Behavior:

- If customer endpoints are unavailable, order and contact records are normalized into customer rows.
- Email addresses are trimmed and lowercased before grouping, so one email produces one customer row.
- Repeated records show a merged-record count; order totals and spend are aggregated for order-source rows.
- The visible, filtered rows can be downloaded as a CSV from the `Export CSV` action.
