# Staging and Production Workflow

Production is the live admin dashboard. Staging should be a separate Vercel project that points to the staging backend and fake/test MongoDB data.

## Branch Flow

1. Feature branch.
2. PR into `staging`.
3. Test admin workflows on the staging admin URL.
4. Merge `staging` into `main` after approval.
5. Production deploys from `main`.

## Required Staging Env

```txt
VITE_API_BASE_URL=https://nees-backend-staging.vercel.app/api
```

Do not point staging to the production backend.
