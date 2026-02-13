import React, { useEffect, useMemo, useState } from "react";
import "./cloudinary.css";
import { API_BASE_URL } from '../../config/api';

const CloudinaryPage = () => {
  const [singleFile, setSingleFile] = useState(null);
  const [multiFiles, setMultiFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");

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
    setError("");
    try {
      const url = new URL(`${API_BASE_URL}/cloudinary/images`);
      if (query.trim()) url.searchParams.set("q", query.trim());
      const resp = await fetch(url.toString(), { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Failed to load images");
      const list = Array.isArray(data?.images) ? data.images : (Array.isArray(data?.data) ? data.data : []);
      setImages(list);
    } catch (err) {
      setError(err.message || "Failed to load images");
      setImages([]);
    }
  };

  useEffect(() => { fetchImages(); }, []); // initial load

  const handleSingleUpload = async (e) => {
    e.preventDefault();
    if (!singleFile) return setError("Please choose an image");
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("image", singleFile);
      const resp = await fetch(`${API_BASE_URL}/cloudinary/add-img`, { method: "POST", headers: { ...getAuthHeaders() }, body: fd });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Upload failed");
      const img = data?.data || data; // { url, id }
      setImages((prev) => [img, ...prev]);
      setSingleFile(null);
      // Keep the list in sync (ensures _id is available for delete).
      await fetchImages();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleUpload = async (e) => {
    e.preventDefault();
    if (!multiFiles || multiFiles.length === 0) return setError("Please choose up to 5 images");
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      Array.from(multiFiles).slice(0, 5).forEach((f) => fd.append("images", f));
      const resp = await fetch(`${API_BASE_URL}/cloudinary/add-multiple-img`, { method: "POST", headers: { ...getAuthHeaders() }, body: fd });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Upload failed");
      const list = data?.data || [];
      setImages((prev) => [...list, ...prev]);
      setMultiFiles([]);
      await fetchImages();
    } catch (err) {
      setError(err.message || "Upload failed");
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
    setUploading(true); setError("");
    try {
      const safeId = encodeURIComponent(String(idOrPublic));
      const resp = await fetch(`${API_BASE_URL}/cloudinary/images/${safeId}`, { method: "DELETE", headers: { ...getAuthHeaders() } });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Delete failed");
      setImages((prev) => prev.filter((im) => (im?._id || im?.publicId) !== idOrPublic));
    } catch (err) {
      setError(err.message || "Delete failed");
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

      {error && <div className="error">{error}</div>}

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
