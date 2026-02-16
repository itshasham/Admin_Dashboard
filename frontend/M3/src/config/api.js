const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "https://backend-three-omega-76.vercel.app/api";

const trimmedBaseUrl = rawBaseUrl.replace(/\/$/, "");

// Accept either ".../api" or just domain in env; normalize to ".../api".
export const API_BASE_URL = /\/api$/i.test(trimmedBaseUrl)
  ? trimmedBaseUrl
  : `${trimmedBaseUrl}/api`;
