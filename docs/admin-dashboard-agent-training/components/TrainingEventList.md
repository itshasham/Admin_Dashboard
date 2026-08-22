# TrainingEventList

Source: `frontend/M3/src/pages/training-events/TrainingEventList.jsx`

Route: `/admin/training-events`

Purpose:

- Manage public training events and registration availability.

Endpoints:

- `GET /training-events/admin/list`
- `PATCH /training-events/admin/:id/toggle-registration`
- `PATCH /training-events/admin/:id/toggle-featured`
- `DELETE /training-events/admin/:id`

State:

- `events`
- `loading`
- `error`
- `query`
- `featuredFilter`
- `registrationFilter`

