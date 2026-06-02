# ContactUsList

Source: `frontend/M3/src/pages/contacts/ContactUsList.jsx`

Route: `/admin/contact-us`

Purpose:

- View, search, mark read, and delete contact form submissions.

Endpoints:

- `GET /contact-us?page=1&limit=200`
- `PATCH /contact-us/:id/read`
- `DELETE /contact-us/:id`

State:

- `messages`
- `loading`
- `error`
- `search`
- `status`

