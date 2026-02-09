import React, { useEffect, useState } from "react";
import "./brand.css";

const API_BASE_URL = " http://localhost:7001/api";

const BrandList = () => {
  const [brands, setBrands] = useState([]);
  const [activeBrands, setActiveBrands] = useState([]);
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

  const deriveId = (b) => b?._id || b?.id || b?._doc?._id || b?.uuid || null;
  const deriveName = (b) => b?.name || b?.title || b?.brandName || "(no name)";
  const deriveLogo = (b) => b?.logo || b?.image || b?.img || (b?.images?.[0]) || "";

  const findFirstArrayOfObjects = (obj, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 2) return null;
    if (Array.isArray(obj) && obj.length && typeof obj[0] === "object") return obj;
    if (Array.isArray(obj)) return obj;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val)) return val;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const found = findFirstArrayOfObjects(val, depth + 1);
      if (found) return found;
    }
    return null;
  };

  const pickArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.brands)) return payload.brands;
    if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    if (payload.data && typeof payload.data === "object") {
      for (const key of Object.keys(payload.data)) {
        const val = payload.data[key];
        if (Array.isArray(val)) return val;
      }
    }
    const candidates = [payload.items, payload.docs, payload.result, payload.rows, payload.list];
    for (const cand of candidates) if (Array.isArray(cand)) return cand;
    const deep = findFirstArrayOfObjects(payload);
    return Array.isArray(deep) ? deep : [];
  };

  const fetchBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/brand/all`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      if (resp.status === 304) { setLoading(false); return; }
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load brands");
      const arr = pickArray(data);
      setBrands(Array.isArray(arr) ? arr : []);
    } catch (err) {
      setError(err.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBrands = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/brand/active`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) return; // silently ignore
      const arr = pickArray(data);
      setActiveBrands(Array.isArray(arr) ? arr : []);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    if (!id) return alert("Missing brand id");
    if (!window.confirm("Delete this brand?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/brand/delete/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await Promise.all([fetchBrands(), fetchActiveBrands()]);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  useEffect(() => { fetchBrands(); fetchActiveBrands(); }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>All Brands</h2>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => (window.location.href = "/admin/brands/new")}>+ Add New Brand</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Logo</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b, idx) => {
            const id = deriveId(b);
            const logo = deriveLogo(b);
            const name = deriveName(b);
            return (
              <tr key={id || idx}>
                <td>
                  {logo ? (
                    <img className="brand-thumb" src={logo} alt={name} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                  ) : (
                    <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                  )}
                </td>
                <td>{name}</td>
                <td>
                  <div className="actions">
                    <button className="btn" disabled={!id} onClick={() => (window.location.href = id ? `/admin/brands/${id}` : "/admin/brands")}>Edit</button>
                    <button className="btn danger" disabled={!id} onClick={() => handleDelete(id)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 24 }}>
        <h3>Active Brands</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeBrands.map((b, idx) => {
              const id = deriveId(b);
              const logo = deriveLogo(b);
              const name = deriveName(b);
              return (
                <tr key={id || idx}>
                  <td>
                    {logo ? (
                      <img className="brand-thumb" src={logo} alt={name} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                    ) : (
                      <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                    )}
                  </td>
                  <td>{name}</td>
                  <td>
                    <div className="actions">
                      <button className="btn" disabled={!id} onClick={() => (window.location.href = id ? `/admin/brands/${id}` : "/admin/brands")}>Edit</button>
                      <button className="btn danger" disabled={!id} onClick={() => handleDelete(id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandList;
