# Training Events And Registrations

Training events are one of the most complex admin modules. They manage public event pages, registration forms, city/location data, media, and PMDC verification for doctors.

## Training Event List

File: `frontend/M3/src/pages/training-events/TrainingEventList.jsx`

Route:

- `/admin/training-events`

Purpose:

- List workshops/webinars/events.
- Filter by query, featured status, and registration open/closed status.
- Toggle featured and registration availability.
- Navigate to event form or registrations.

Endpoints:

- `GET /training-events/admin/list`
- `PATCH /training-events/admin/:id/toggle-registration`
- `PATCH /training-events/admin/:id/toggle-featured`
- `DELETE /training-events/admin/:id`

Important behavior:

- `registrationFilter` controls open/closed/all list filtering.
- `featuredFilter` controls featured/all filtering.
- Toggle writes optimistic local state only after backend success.
- Has direct entry button for all registrations.

## Training Event Form

File: `frontend/M3/src/pages/training-events/TrainingEventForm.jsx`

Routes:

- `/admin/training-events/new`
- `/admin/training-events/:id`

Purpose:

- Create/edit event metadata, content, gallery, registration fields, and publication controls.

Endpoints:

- `GET /training-events/admin/:id`
- `POST /cloudinary/add-multiple-img`
- `POST /training-events/admin`
- `PATCH /training-events/admin/:id`

Important state:

- `eventData`
- `pendingUploads`
- `dragActive`
- `loading`
- `saving`
- `uploading`
- `error`
- `validationIssues`

Important fields:

- Title and slug.
- Event date/time.
- Event city and venue/location.
- Hero/cover images.
- Gallery/media.
- Featured flag.
- Registration enabled flag.
- Registration deadline.
- Closed/unavailable messages.
- Dynamic registration fields.
- Organizer name and event details.

Upload behavior:

- Selected images are held as `pendingUploads`.
- On save, pending images upload to Cloudinary first.
- Uploaded image URLs are merged into event payload.

## Registration Management

File: `frontend/M3/src/pages/training-events/TrainingEventRegistrations.jsx`

Routes:

- `/admin/training-events/registrations`
- `/admin/training-events/:id/registrations`

Purpose:

- Manage doctor/event registrations.
- Filter/search/export registration data.
- Approve/reject registrations.
- Track and retry PMDC verification.
- Run direct browser PMDC verification.
- Bulk verify selected PMDC registrations.

Main endpoints:

- `GET /training-events/admin/:id`
- `GET /training-events/admin/list`
- `GET /training-events/admin/registrations/pmdc-stats`
- `POST /training-events/admin/registrations/process-pmdc`
- `POST /training-events/admin/registrations/reset-locks`
- `GET /training-events/admin/:id/registrations`
- `GET /training-events/admin/registrations`
- `PATCH /training-events/admin/registrations/:registrationId/status`
- `PATCH /training-events/admin/registrations/:registrationId/approve`
- `PATCH /training-events/admin/registrations/:registrationId/reject`
- `PATCH /training-events/admin/registrations/:registrationId/browser-pmdc-verification`
- `PATCH /training-events/admin/registrations/:registrationId/retry-verification`
- `GET /training-events/admin/registrations/:registrationId/pmdc-diagnostics`
- `DELETE /training-events/admin/registrations/:registrationId`
- `GET /training-events/admin/registrations/export/:format`

PMDC browser endpoints called directly from browser:

- `https://hospitals-inspections.pmdc.pk/api/DRC/GetData`
- `https://hospitals-inspections.pmdc.pk/api/DRC/GetQualifications`

Filters:

- Search text.
- Event.
- Event city.
- Registration status.
- PMDC status.
- From/to date.

Selection behavior:

- Header checkbox selects all filtered rows.
- `selectedIds` stores selected registration ids.
- `selectedVerifiableRows` filters selected rows through `canRetryPmdcVerification`.

Bulk PMDC verification:

- Button label: `Verify Selected PMDC (...)`
- Runs `bulkVerifySelectedPmdc`.
- Skips rows already verified or in final registration statuses.
- For each selected row:
  1. Calls direct browser PMDC lookup.
  2. If result is not failed, saves via `/browser-pmdc-verification`.
  3. If browser lookup fails, falls back to `/retry-verification`.
  4. Updates progress such as `Verifying 3/10`.
- Shows summary alert with verified, saved for review, queued, failed, and skipped counts.

Single retry behavior:

- Uses the same `runDirectPmdcVerification` helper.
- If direct browser verification succeeds, saves result immediately.
- If it cannot verify in browser, queues/executes server retry.

Approval/rejection behavior:

- Approve endpoint marks registration approved.
- Reject prompts for optional rejection reason and sends it to backend.
- Rejected PMDC-verified rows may become manual review on backend.

Export behavior:

- Formats: xlsx, csv, pdf.
- Scope can include selected or filtered rows.
- Column selection is based on `exportColumnOptions`.

Agent guidance:

- This module touches public event operations and doctor verification. Make small, reversible changes.
- PMDC direct browser lookup depends on CORS/portal availability; always keep server fallback unless explicitly removed.
- Bulk verification intentionally runs sequentially to avoid flooding PMDC and to keep progress understandable.

