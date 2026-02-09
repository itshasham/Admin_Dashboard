import React, { useEffect, useState } from "react";
import "./category.css";
import { API_BASE_URL } from '../../config/api';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const pickArray = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.result)) return payload.result;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.result)) return payload.data.result;
    if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    return [];
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/category/all`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      if (resp.status === 304) { setLoading(false); return; }
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load categories");
      const arr = pickArray(data);
      setCategories(arr);
    } catch (err) {
      setError(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/category/delete/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchCategories();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>Categories</h2>
          <p className="muted">Create, view and manage product categories</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => (window.location.href = "/admin/categories/new")}>+ New Category</button>
        </div>
      </div>
      <table className="table animated-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Parent</th>
            <th>Product Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c, idx) => (
            <tr key={c._id || idx} className="fade-in-row">
              <td>
                {c?.img ? (
                  <img className="brand-thumb" src={c.img} alt={c?.parent || "category"} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                )}
              </td>
              <td>{c.parent}</td>
              <td>{c.productType}</td>
              <td>
                <span className={`status-badge ${c.status === 'Show' ? 'status-active' : c.status === 'Hide' ? 'status-inactive' : 'status-unknown'}`}>{c.status}</span>
              </td>
              <td>
                <div className="actions">
                  <button className="btn" onClick={() => (window.location.href = `/admin/categories/${c._id}`)}>Edit</button>
                  <button className="btn danger" onClick={() => handleDelete(c._id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryList;
