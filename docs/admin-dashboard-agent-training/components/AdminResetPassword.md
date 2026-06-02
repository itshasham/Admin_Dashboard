# AdminResetPassword

Source: `frontend/M3/src/pages/AdminResetPassword.jsx`

Route: `/admin/reset-password/:token`

Purpose:

- Confirms password reset using token route param.

Endpoint:

- `POST /admin/confirm-forget-password`

State:

- `formData`
- `loading`
- `error`
- `success`
- `tokenValid`

Behavior:

- Validates token.
- Confirms password and confirm password match.
- Redirects to login after successful reset.

