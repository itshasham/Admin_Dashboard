# AdminStaff

Source: `frontend/M3/src/pages/AdminStaff.jsx`

Route: `/admin/staff`

Purpose:

- Manage staff/admin accounts.

Endpoints:

- `GET /admin/all`
- `POST /admin/add`
- `PATCH /admin/update-stuff/:id`
- `DELETE /admin/:staffId`

State:

- `staff`
- `loading`
- `showAddForm`
- `editingStaff`
- `currentUser`
- `accessDenied`
- `imageErrors`
- `formData`

Important:

- Backend uses `update-stuff`, not `update-staff`.

