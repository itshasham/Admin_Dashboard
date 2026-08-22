# TrainingEventForm

Source: `frontend/M3/src/pages/training-events/TrainingEventForm.jsx`

Routes:

- `/admin/training-events/new`
- `/admin/training-events/:id`

Purpose:

- Create/edit event details, media, and registration form settings.

Endpoints:

- `GET /training-events/admin/:id`
- `POST /cloudinary/add-multiple-img`
- `POST /training-events/admin`
- `PATCH /training-events/admin/:id`

State:

- `eventData`
- `pendingUploads`
- `dragActive`
- `loading`
- `saving`
- `uploading`
- `validationIssues`

