import React, { useState } from "react";
import "./cloudinary.css";
import { API_BASE_URL } from '../../config/api';

const CloudinaryPage = () => {
  const [singleFile, setSingleFile] = useState(null);
  const [multiFiles, setMultiFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [folder, setFolder] = useState("products");
  const [deleteId, setDeleteId] = useState("");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const handleSingleUpload = async (e) => {
    e.preventDefault();
    if (!singleFile) return setError("Please choose an image");
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("image", singleFile);
      const resp = await fetch(`${API_BASE_URL}/cloudinary/add-img`, { method: "POST", headers: { ...getAuthHeaders() }, body: fd });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Upload failed");
      const img = data?.data || data; // { url, id }
      setImages((prev) => [img, ...prev]);
      setSingleFile(null);
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
      if (!resp.ok) throw new Error(data?.message || "Upload failed");
      const list = data?.data || [];
      setImages((prev) => [...list, ...prev]);
      setMultiFiles([]);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imgId) => {
    const idToDelete = imgId || deleteId;
    if (!idToDelete || !folder) return setError("Provide folder and id");
    if (!window.confirm("Delete this image?")) return;
    setUploading(true); setError("");
    try {
      const url = new URL(`${API_BASE_URL}/cloudinary/img-delete`);
      url.searchParams.set("folder_name", folder);
      url.searchParams.set("id", idToDelete);
      const resp = await fetch(url.toString(), { method: "DELETE", headers: { ...getAuthHeaders() } });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      setImages((prev) => prev.filter((im) => (im?.id || im?._id) !== idToDelete));
      setDeleteId("");
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>Cloudinary</h2>
          <p className="muted">Upload and manage media with ease</p>
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
        <h3>Delete Image</h3>
        <div className="grid two-col gap-16">
          <div className="field">
            <label>Folder Name</label>
            <input value={folder} onChange={(e) => setFolder(e.target.value)} />
          </div>
          <div className="field">
            <label>Public ID</label>
            <input value={deleteId} onChange={(e) => setDeleteId(e.target.value)} placeholder="e.g., products/abc123xyz" />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn danger" onClick={() => handleDelete()}>Delete by ID</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent Uploads</h3>
        <div className="gallery">
          {images.map((im, idx) => (
            <div className="gallery-item fade-in" key={(im?.id || im?._id || idx)}>
              <img src={im?.url || im} alt="upload" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <div className="gallery-meta">
                <div className="meta-id">{im?.id || im?._id || ""}</div>
                <button className="btn danger" onClick={() => handleDelete(im?.id || im?._id)}>Delete</button>
              </div>
            </div>
          ))}
          {!images.length && <div className="muted">No uploads yet</div>}
        </div>
      </div>
    </div>
  );
};

export default CloudinaryPage;
