import React, { useEffect, useMemo, useState } from "react";
import "./cloudinary.css";
import { API_BASE_URL } from '../../config/api';
import { parseApiError } from "../../utils/api-error";

const CloudinaryPage = () => {
  const [singleFile, setSingleFile] = useState(null);
  const [multiFiles, setMultiFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorDetails, setErrorDetails] = useState([]);
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");

  const clearError = () => {
    setErrorTitle("");
    setErrorDetails([]);
  };

  const setFriendlyError = (title, details = []) => {
    setErrorTitle(String(title || "").trim() || "Something went wrong.");
    setErrorDetails(Array.isArray(details) ? details.filter(Boolean) : []);
  };

  const clearAdminSessionAndGoLogin = () => {
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminData");
    } catch {
      // ignore
    }
    window.location.href = "/admin/login";
  };

  const isNetworkFetchError = (err) =>
    err &&
    (err.name === "TypeError" || err instanceof TypeError) &&
    /failed to fetch/i.test(String(err.message || ""));

  const handleHttpError = (resp, data, fallbackSummary) => {
    const status = Number(resp?.status || 0);

    if (status === 401) {
      setFriendlyError("You are not logged in (session expired).", [
        "Please log in again and retry.",
      ]);
      clearAdminSessionAndGoLogin();
      return;
    }

    if (status === 403) {
      setFriendlyError("Access denied for Image Manager.", [
        "Your account must be Admin, Manager, or CEO to manage images.",
        "Ask your administrator to update your role.",
      ]);
      return;
    }

    if (status === 413) {
      setFriendlyError("This file is too large to upload.", [
        "Try a smaller image (recommended under 5 MB).",
        "Use JPG/PNG/WebP and resize if needed.",
      ]);
      return;
    }

    if (status === 429) {
      setFriendlyError("Too many requests.", [
        "Please wait 30 seconds and try again.",
      ]);
      return;
    }

    const parsed = parseApiError(data, fallbackSummary);
    const rawMsg = String(data?.message || data?.error || "").toLowerCase();
    if (
      status >= 500 &&
      (rawMsg.includes("cloudinary") ||
        rawMsg.includes("api_key") ||
        rawMsg.includes("cloud_name") ||
        rawMsg.includes("api secret"))
    ) {
      setFriendlyError("Image service is not configured on the server.", [
        "This is a backend setup issue (Cloudinary keys).",
        "Contact the developer to verify Cloudinary environment variables on the backend deployment.",
      ]);
      return;
    }

    setFriendlyError(parsed.summary, parsed.issues);
  };

  const validateImageFiles = (files, { maxCount = 1 } = {}) => {
    const MAX_MB = 5;
    const maxBytes = MAX_MB * 1024 * 1024;
    const list = Array.from(files || []).slice(0, maxCount);
    const problems = [];

    if (list.length === 0) {
      problems.push("Please choose an image file.");
      return { ok: false, problems, files: [] };
    }

    list.forEach((file, idx) => {
      if (!file) return;
      const name = file.name || `file ${idx + 1}`;
      if (!String(file.type || "").startsWith("image/")) {
        problems.push(`${name}: Not an image file. Please select JPG/PNG/WebP.`);
      }
      if (Number(file.size || 0) > maxBytes) {
        problems.push(`${name}: Too large. Please keep images under ${MAX_MB} MB.`);
      }
    });

    return { ok: problems.length === 0, problems, files: list };
  };

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("adminData");
      const parsed = raw ? JSON.parse(raw) : null;
      setRole(String(parsed?.role || ""));
    } catch {
      setRole("");
    }
  }, []);

  const fetchImages = async () => {
    clearError();
    try {
      const url = new URL(`${API_BASE_URL}/cloudinary/images`);
      if (query.trim()) url.searchParams.set("q", query.trim());
      const resp = await fetch(url.toString(), { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        handleHttpError(resp, data, "Could not load images. Please try again.");
        setImages([]);
        return;
      }
      const list = Array.isArray(data?.images) ? data.images : (Array.isArray(data?.data) ? data.data : []);
      setImages(list);
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setFriendlyError("Cannot connect to the server.", [
          "Check your internet connection and try Refresh.",
          "If it still fails, the backend may be down or blocked by the browser/network.",
        ]);
      } else {
        setFriendlyError(err.message || "Failed to load images");
      }
      setImages([]);
    }
  };

  useEffect(() => { fetchImages(); }, []); // initial load

  const handleSingleUpload = async (e) => {
    e.preventDefault();
    const validation = validateImageFiles(singleFile ? [singleFile] : [], { maxCount: 1 });
    if (!validation.ok) {
      setFriendlyError("Cannot upload image.", validation.problems);
      return;
    }
    setUploading(true);
    clearError();
    try {
      const fd = new FormData();
      fd.append("image", validation.files[0]);
      const resp = await fetch(`${API_BASE_URL}/cloudinary/add-img`, { method: "POST", headers: { ...getAuthHeaders() }, body: fd });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        handleHttpError(resp, data, "Upload failed. Please try again.");
        return;
      }
      const img = data?.data || data; // { url, id }
      setImages((prev) => [img, ...prev]);
      setSingleFile(null);
      // Keep the list in sync (ensures _id is available for delete).
      await fetchImages();
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setFriendlyError("Upload failed because the server could not be reached.", [
          "Check your internet connection.",
          "Try again in a few seconds.",
        ]);
      } else {
        setFriendlyError(err.message || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleUpload = async (e) => {
    e.preventDefault();
    const validation = validateImageFiles(multiFiles || [], { maxCount: 5 });
    if (!validation.ok) {
      setFriendlyError("Cannot upload images.", validation.problems);
      return;
    }
    setUploading(true);
    clearError();
    try {
      const fd = new FormData();
      validation.files.forEach((f) => fd.append("images", f));
      const resp = await fetch(`${API_BASE_URL}/cloudinary/add-multiple-img`, { method: "POST", headers: { ...getAuthHeaders() }, body: fd });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        handleHttpError(resp, data, "Upload failed. Please try again.");
        return;
      }
      const list = data?.data || [];
      setImages((prev) => [...list, ...prev]);
      setMultiFiles([]);
      await fetchImages();
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setFriendlyError("Upload failed because the server could not be reached.", [
          "Check your internet connection.",
          "Try again in a few seconds.",
        ]);
      } else {
        setFriendlyError(err.message || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url) => {
    const value = String(url || "");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const handleDelete = async (img) => {
    const idOrPublic = img?._id || img?.publicId;
    if (!idOrPublic) return;
    if (!window.confirm("Delete this image?")) return;
    setUploading(true);
    clearError();
    try {
      const safeId = encodeURIComponent(String(idOrPublic));
      const resp = await fetch(`${API_BASE_URL}/cloudinary/images/${safeId}`, { method: "DELETE", headers: { ...getAuthHeaders() } });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        handleHttpError(resp, data, "Delete failed. Please try again.");
        return;
      }
      setImages((prev) => prev.filter((im) => (im?._id || im?.publicId) !== idOrPublic));
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setFriendlyError("Delete failed because the server could not be reached.", [
          "Check your internet connection and try again.",
        ]);
      } else {
        setFriendlyError(err.message || "Delete failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return images;
    return images.filter((im) => {
      const hay = [im?.publicId, im?.folder, im?.url].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [images, query]);

  if (role && !["CEO", "Manager", "Admin"].includes(role)) {
    return (
      <div className="page-container">
        <div className="error">Access denied</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>Image Manager</h2>
          <p className="muted">Upload, copy URLs, and reuse images for products</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
        </div>
      </div>

      {errorTitle && (
        <div className="error-panel" role="alert" aria-live="polite">
          <p className="error-panel-title">{errorTitle}</p>
          {errorDetails.length > 0 && (
            <ul className="error-panel-list">
              {errorDetails.map((line, idx) => (
                <li key={`${line}-${idx}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid two-col gap-16">
        <div className="card">
          <h3>Single Upload</h3>
          <form onSubmit={handleSingleUpload} className="grid" style={{ gap: 12 }}>
            <input type="file" accept="image/*" onChange={(e) => setSingleFile(e.target.files?.[0] || null)} />
            <button className="btn" type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload Image"}</button>
          </form>
        </div>

        <div className="card">
          <h3>Multiple Upload (max 5)</h3>
          <form onSubmit={handleMultipleUpload} className="grid" style={{ gap: 12 }}>
            <input multiple type="file" accept="image/*" onChange={(e) => setMultiFiles(e.target.files || [])} />
            <button className="btn" type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload Images"}</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>All Images</h3>
          <div className="actions">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by folder / id / url"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
            />
            <button className="btn secondary" onClick={fetchImages} disabled={uploading}>Refresh</button>
          </div>
        </div>
        <div className="gallery">
          {filtered.map((im, idx) => (
            <div className="gallery-item fade-in" key={(im?._id || im?.publicId || idx)}>
              <img src={im?.url || ""} alt={im?.publicId || "upload"} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <div className="gallery-meta">
                <div className="meta-id" title={im?.publicId || ""}>{im?.publicId || ""}</div>
                <div className="gallery-actions">
                  <button className="btn secondary" onClick={() => copyUrl(im?.url)}>Copy URL</button>
                  <button className="btn danger" onClick={() => handleDelete(im)} disabled={uploading}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="muted">No images found</div>}
        </div>
      </div>
    </div>
  );
};

export default CloudinaryPage;
