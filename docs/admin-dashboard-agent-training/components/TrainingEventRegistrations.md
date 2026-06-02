# TrainingEventRegistrations

Source: `frontend/M3/src/pages/training-events/TrainingEventRegistrations.jsx`

Routes:

- `/admin/training-events/registrations`
- `/admin/training-events/:id/registrations`

Purpose:

- Manage event registrations, approval status, PMDC verification, exports, and diagnostics.

Endpoints:

- `GET /training-events/admin/:id`
- `GET /training-events/admin/list`
- `GET /training-events/admin/registrations/pmdc-stats`
- `POST /training-events/admin/registrations/process-pmdc`
- `POST /training-events/admin/registrations/reset-locks`
- `GET /training-events/admin/:id/registrations`
- `GET /training-events/admin/registrations`
- `PATCH /training-events/admin/registrations/:id/status`
- `PATCH /training-events/admin/registrations/:id/approve`
- `PATCH /training-events/admin/registrations/:id/reject`
- `PATCH /training-events/admin/registrations/:id/browser-pmdc-verification`
- `PATCH /training-events/admin/registrations/:id/retry-verification`
- `GET /training-events/admin/registrations/:id/pmdc-diagnostics`
- `DELETE /training-events/admin/registrations/:id`
- `GET /training-events/admin/registrations/export/:format`

Special behavior:

- Direct PMDC browser lookup.
- Server fallback retry.
- Bulk selected PMDC verification.
- Selected/filtered export.

