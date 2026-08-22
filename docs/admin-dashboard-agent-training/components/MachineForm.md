# MachineForm

Source: `frontend/M3/src/pages/machines/MachineForm.jsx`

Routes:

- `/admin/machines/new`
- `/admin/machines/:id`

Purpose:

- Create/edit inquiry-focused machine listings.

Endpoints:

- `GET /brand/all`
- `GET /machines/:id`
- `GET /cloudinary/images`
- `POST /machines`
- `PATCH /machines/:id`

State:

- `machine`
- `brands`
- `newImageUrl`
- `loading`
- `saving`
- `validationIssues`
- image manager state

