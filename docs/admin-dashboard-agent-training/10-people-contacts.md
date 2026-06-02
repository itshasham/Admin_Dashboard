# People And Contacts

## Staff Management

File: `frontend/M3/src/pages/AdminStaff.jsx`

Route:

- `/admin/staff`

Purpose:

- Manage admin/staff users.
- Allow adding, editing, and deleting staff accounts.

Endpoints:

- `GET /admin/all`
- `POST /admin/add`
- `PATCH /admin/update-stuff/:id`
- `DELETE /admin/:staffId`

Important behavior:

- Reads token and current admin profile from localStorage.
- Redirects to login if auth data is missing.
- Tracks `currentUser`.
- Uses `accessDenied` to show permission failure.
- Has local add/edit form toggled by `showAddForm` and `editingStaff`.
- Tracks broken profile images with `imageErrors`.

Agent guidance:

- Backend endpoint uses `update-stuff`, not `update-staff`. Keep the existing spelling unless backend changes.

## User List

File: `frontend/M3/src/pages/users/UserList.jsx`

Route:

- `/admin/users`

Purpose:

- View customer/user accounts.

Internal role behavior:

- Only `CEO` should see the list.
- If role is present and not CEO, the page returns access denied.

Endpoint behavior:

- Uses helper `tryFetch(path)` with `API_BASE_URL + path`.
- Tries `GET /admin/customers`.
- Falls back to `GET /admin/users`.
- `pickArray` accepts response shapes like `data`, `users`, `data.users`, `customers`, and `data.customers`.

Important state:

- `users`
- `loading`
- `error`
- `role`

Agent guidance:

- Keep CEO-only guard unless the business explicitly broadens user visibility.

## Contact Messages

File:

- `frontend/M3/src/pages/contacts/ContactUsList.jsx`

Route:

- `/admin/contact-us`

Allowed route roles:

- `Manager`
- `CEO`

Purpose:

- Review customer contact/inquiry submissions.

Common behavior:

- Loads contact messages with `GET /contact-us?page=1&limit=200`.
- Optional query params: `q`, `status`.
- Marks new messages as read with `PATCH /contact-us/:id/read`.
- Deletes messages with `DELETE /contact-us/:id`.
- Shows unread count where `status` is `new`.
- Filters are search text and status (`new`, `read`, `resolved`).
- Table columns: date, name, email, subject, message, status, actions.

Agent guidance:

- Treat contact data as customer communication. Avoid exposing it to lower roles unless approved.
