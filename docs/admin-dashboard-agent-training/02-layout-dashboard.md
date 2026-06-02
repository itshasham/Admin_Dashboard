# Layout And Dashboard

## Dashboard Page

File: `frontend/M3/src/pages/AdminDashboard.jsx`

Purpose:

- Main landing page after login.
- Shows summary metrics, quick navigation, sales/order charts, and recent order activity.
- Acts as the operational hub for admins.

## Authentication Behavior

On mount:

- Reads `adminToken`.
- Reads `adminData`.
- If token is missing, navigates to `/admin/login`.
- If profile exists, stores it in `adminData` state.

Logout:

- Removes `adminToken`.
- Removes `adminData`.
- Navigates to `/admin/login`.

## Dashboard Data Sources

The page fetches order/dashboard data from fallback endpoints. It tries admin-specific endpoints first, then legacy endpoints if needed.

Important endpoints:

- `GET /order/admin/orders`
- `GET /order/orders`
- `GET /user-order/dashboard-recent-order`

The dashboard derives:

- Total amount.
- Order count.
- Recent orders.
- Order counts by status.
- Category/product distribution where available.
- Last 7 days sales data.

## Navigation Tiles

The dashboard includes navigation to major admin areas:

- Products
- Clinical products
- Machines
- Accessories
- Brands
- Categories
- Orders
- Users
- Staff
- Coupons
- Cloudinary
- Blogs
- Training events
- Contact messages

Each navigation action uses `navigate(path)`.

## Mobile Navigation

State:

- `mobileNavOpen`

Purpose:

- Allows dashboard navigation to collapse/expand on smaller screens.

When editing dashboard layout, preserve mobile access to all key admin modules.

## Visual Components Inside Dashboard

The file contains small render helpers/components for charts and data cards. They are not shared outside the dashboard.

Functional purposes:

- Metric cards: show high-level business totals.
- Sales chart: visualizes recent order totals.
- Category chart/list: shows distribution.
- Recent orders panel: gives quick operational visibility.

## Error Handling

State:

- `error`
- `errorDebug`

The dashboard exposes user-facing failures and stores additional debug details when fallback fetches fail.

Agent guidance:

- Do not hide backend errors silently.
- Preserve fallback endpoint behavior because the backend has had route transitions.

