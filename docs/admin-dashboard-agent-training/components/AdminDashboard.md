# AdminDashboard

Source: `frontend/M3/src/pages/AdminDashboard.jsx`

Route: `/admin/dashboard`

Purpose:

- Main admin home and navigation hub.
- Displays order/revenue summaries and recent operational activity.

Endpoints:

- `GET /order/admin/orders`
- `GET /order/orders`
- `GET /user-order/dashboard-recent-order`

State:

- `adminData`
- `loading`
- `error`
- `errorDebug`
- `amounts`
- `salesReport`
- `categoryData`
- `recentOrders`
- `orderCounts`
- `mobileNavOpen`

Behavior:

- Redirects to login if token/profile missing.
- Logout clears auth localStorage.
- Navigation cards call `navigate(path)`.

