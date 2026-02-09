import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./brand.css";
import { API_BASE_URL } from '../../config/api';

const emptyBrand = {
  logo: "",
  name: "",
  description: "",
  status: "active",
};

const BrandForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [brand, setBrand] = useState(emptyBrand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      try {
        const resp = await fetch(`${API_BASE_URL}/brand/get/${id}`, { headers: { ...getAuthHeaders() } });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || "Failed to load brand");
        const payload = data?.data || data || emptyBrand;
        setBrand({ ...emptyBrand, ...payload });
      } catch (err) {
        setError(err.message || "Failed to load brand");
      }
    };
    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBrand((prev) => ({ ...prev, [name]: value }));
  };

  const extractValidationMessage = (data) => {
    if (!data) return "Validation failed";
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (data.errors && typeof data.errors === "object") {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey) {
        const val = data.errors[firstKey];
        if (Array.isArray(val) && val[0]) return `${firstKey}: ${val[0]}`;
        if (typeof val === "string") return `${firstKey}: ${val}`;
        if (val && typeof val.message === "string") return `${firstKey}: ${val.message}`;
      }
    }
    if (Array.isArray(data.details) && data.details[0]?.message) return data.details[0].message;
    return "Validation error. Please check your inputs.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = isEdit ? `${API_BASE_URL}/brand/edit/${id}` : `${API_BASE_URL}/brand/add`;
      const method = isEdit ? "PATCH" : "POST";

      const { name, logo, description, status } = brand;
      const payload = { name, logo, description, status };

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => ({})) : {};
      if (!resp.ok) {
        const msg = resp.status === 400 ? extractValidationMessage(data) : (data?.message || "Save failed");
        throw new Error(msg);
      }
      window.location.href = "/admin/brands";
    } catch (err) {
      setError(err.message || "Save failed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>{isEdit ? "Edit Brand" : "New Brand"}</h2>
          <p className="muted">Present your brand with clarity and polish</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card compact">
        <form onSubmit={handleSubmit} className="product-form form-grid-2">
          <div className="section appear">
            <div className="section-title">
              <h3>Basics</h3>
              <span className="hint">Core information</span>
            </div>
            <div className="form-table">
              <div className="form-row">
                <div className="form-cell">Name</div>
                <div className="form-cell"><input name="name" placeholder="Brand name" value={brand.name} onChange={handleChange} required /></div>
              </div>
              <div className="form-row">
                <div className="form-cell">Status</div>
                <div className="form-cell"><select name="status" value={brand.status} onChange={handleChange} required><option value="active">active</option><option value="inactive">inactive</option></select></div>
              </div>
            </div>
          </div>

          <div className="section appear">
            <div className="section-title">
              <h3>Media</h3>
              <span className="hint">Visual identity</span>
            </div>
            <div className="form-table">
              <div className="form-row">
                <div className="form-cell">Logo URL</div>
                <div className="form-cell">
                  <input name="logo" placeholder="https://example.com/logo.png" value={brand.logo} onChange={handleChange} required />
                  <div className="preview-row">
                    <div className="preview">
                      {brand.logo ? (
                        <img src={brand.logo} alt="Logo Preview" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      ) : (
                        <div className="preview-placeholder">No logo</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section appear" style={{ gridColumn: '1 / -1' }}>
            <div className="section-title">
              <h3>Description</h3>
              <span className="hint">Tell your brand story</span>
            </div>
            <div className="form-table">
              <div className="form-row">
                <div className="form-cell">Description</div>
                <div className="form-cell"><textarea name="description" placeholder="Sportswear and footwear brand" value={brand.description} onChange={handleChange} rows={5} /></div>
              </div>
            </div>
          </div>

          <div className="sticky-actions appear" style={{ gridColumn: '1 / -1' }}>
            <div className="actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Brand"}</button>
              <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/brands")}>Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandForm;
