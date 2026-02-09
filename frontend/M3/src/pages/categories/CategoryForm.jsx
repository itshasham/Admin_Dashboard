import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./category.css";

const API_BASE_URL = " http://localhost:7001/api";

const emptyCategory = {
  img: "",
  parent: "",
  children: [],
  productType: "",
  description: "",
  status: "Show",
};

const CategoryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [category, setCategory] = useState(emptyCategory);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [childInput, setChildInput] = useState("");

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
        const resp = await fetch(`${API_BASE_URL}/category/get/${id}`, { headers: { ...getAuthHeaders() } });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || "Failed to load category");
        const payload = data?.data || data || emptyCategory;
        payload.children = Array.isArray(payload.children) ? payload.children : [];
        setCategory({ ...emptyCategory, ...payload });
      } catch (err) {
        setError(err.message || "Failed to load category");
      }
    };
    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategory((prev) => ({ ...prev, [name]: value }));
  };

  const addChild = () => {
    const val = childInput.trim();
    if (!val) return;
    setCategory((prev) => ({ ...prev, children: [...prev.children, val] }));
    setChildInput("");
  };

  const removeChild = (idx) => {
    setCategory((prev) => ({ ...prev, children: prev.children.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = isEdit ? `${API_BASE_URL}/category/edit/${id}` : `${API_BASE_URL}/category/add`;
      const method = isEdit ? "PATCH" : "POST";
      const payload = { ...category };
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Save failed");
      window.location.href = "/admin/categories";
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
          <h2>{isEdit ? "Edit Category" : "New Category"}</h2>
          <p className="muted">Well-structured categories help customers browse faster</p>
        </div>
        <div className="actions">
          <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="grid two-col gap-16">
          <div className="field">
            <label>Parent</label>
            <input name="parent" placeholder="e.g., Headphones" value={category.parent} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Product Type</label>
            <input name="productType" placeholder="e.g., electronics" value={category.productType} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Status</label>
            <select name="status" value={category.status} onChange={handleChange}>
              <option value="Show">Show</option>
              <option value="Hide">Hide</option>
            </select>
          </div>

          <div className="field">
            <label>Image URL</label>
            <input name="img" placeholder="https://example.com/cat.png" value={category.img} onChange={handleChange} />
          </div>

          <div className="field full">
            <label>Description</label>
            <textarea name="description" placeholder="Describe this category" value={category.description} onChange={handleChange} rows={4} />
          </div>

          <div className="field full">
            <label>Preview</label>
            <div className="preview-row">
              <div className="preview">
                {category.img ? (
                  <img src={category.img} alt="Category" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <div className="preview-placeholder">No image</div>
                )}
              </div>
            </div>
          </div>

          <div className="field full">
            <label>Children</label>
            <div className="chip-input">
              <input value={childInput} onChange={(e) => setChildInput(e.target.value)} placeholder="Add child (press Add)" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChild(); } }} />
              <button type="button" className="btn" onClick={addChild}>Add</button>
            </div>
            <div className="chips">
              {category.children.map((child, idx) => (
                <span key={`${child}-${idx}`} className="chip fade-in">
                  {child}
                  <button type="button" className="chip-remove" onClick={() => removeChild(idx)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Category" : "Create Category"}</button>
            <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/categories")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;
