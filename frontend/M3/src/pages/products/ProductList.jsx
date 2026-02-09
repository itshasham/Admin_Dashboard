import React, { useEffect, useState } from "react";
import "./product.css";
import { API_BASE_URL } from '../../config/api';

const ProductList = () => {
  const [products, setProducts] = useState([]);
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
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.products)) return payload.products;
    if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    const candidates = [payload.items, payload.docs, payload.result, payload.rows, payload.list];
    for (const cand of candidates) if (Array.isArray(cand)) return cand;
    return [];
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/product/all`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load products");
      setProducts(pickArray(data));
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return alert("Missing product id");
    if (!window.confirm("Delete this product?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/product/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchProducts();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Products</h2>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => (window.location.href = "/admin/products/new")}>+ Add New Product</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Title</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => {
            const id = p?._id || p?.id;
            const img = p?.img || (Array.isArray(p?.imageURLs) && p.imageURLs[0]?.img) || "";
            const title = p?.title || p?.name || "(no title)";
            return (
              <tr key={id || idx}>
                <td>
                  {img ? (
                    <img className="brand-thumb" src={img} alt={title} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                  ) : (
                    <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                  )}
                </td>
                <td>{title}</td>
                <td>{typeof p?.price === "number" ? p.price.toFixed(2) : p?.price || "-"}</td>
                <td>
                  <div className="actions">
                    <button className="btn" disabled={!id} onClick={() => (window.location.href = id ? `/admin/products/${id}` : "/admin/products")}>Edit</button>
                    <button className="btn danger" disabled={!id} onClick={() => handleDelete(id)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
