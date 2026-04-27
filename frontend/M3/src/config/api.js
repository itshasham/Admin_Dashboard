const REMOTE_DEFAULT_API = "https://backend-three-omega-76.vercel.app/api";

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const LOCAL_DEFAULT_API = normalizeBaseUrl(
  import.meta.env.VITE_LOCAL_API_BASE_URL || "http://localhost:3030/api"
);

const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const useRemoteApiInDev = String(import.meta.env.VITE_USE_REMOTE_API_IN_DEV || "").toLowerCase() === "true";
const host =
  typeof window !== "undefined" && window.location
    ? String(window.location.hostname || "").toLowerCase()
    : "";
const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";

const shouldUseLocalDefault =
  isLocalHost &&
  !useRemoteApiInDev &&
  (!configuredBaseUrl || configuredBaseUrl === normalizeBaseUrl(REMOTE_DEFAULT_API));

const selectedBaseUrl = shouldUseLocalDefault
  ? LOCAL_DEFAULT_API
  : configuredBaseUrl || REMOTE_DEFAULT_API;

export const API_BASE_URL = normalizeBaseUrl(selectedBaseUrl);
