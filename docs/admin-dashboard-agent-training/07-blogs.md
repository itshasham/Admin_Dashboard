# Blogs

## Blog List

File: `frontend/M3/src/pages/blogs/BlogList.jsx`

Route:

- `/admin/blogs`

Purpose:

- Manage editorial/blog content for the storefront.
- Filter by status and category.

Endpoints:

- `GET /blogs/admin/list`
- `DELETE /blogs/:id`

Important behavior:

- Builds URL with status/category filters.
- Displays cards/table rows for blog posts.
- Edit navigates to `/admin/blogs/:id`.
- New navigates to `/admin/blogs/new`.

## Blog Form

File: `frontend/M3/src/pages/blogs/BlogForm.jsx`

Routes:

- `/admin/blogs/new`
- `/admin/blogs/:id`

Purpose:

- Create and edit SEO-rich blog posts.

Endpoints:

- `GET /blogs/:id`
- `POST /blogs`
- `PATCH /blogs/:id`

Important content areas:

- Title/slug/excerpt.
- Main content.
- Featured image.
- Gallery URLs.
- Category/tags.
- Workflow/status.
- SEO title/description/canonical URL.

Important state:

- `blog`
- `newGalleryUrl`
- `loading`
- `saving`
- `error`
- `validationIssues`

Behavior:

- Loads existing post in edit mode.
- Supports gallery URL add/remove.
- Shows validation issues from backend.
- Navigates back to `/admin/blogs` after save.

Agent guidance:

- Blog posts affect public SEO. Preserve canonical, meta, and workflow fields.
- Avoid changing slug behavior casually; public URLs may depend on it.

