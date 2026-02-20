import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./brand.css";
import { API_BASE_URL } from "../../config/api";

const BrandList = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [activeBrands, setActiveBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("all");
  const [imageErrors, setImageErrors] = useState({});

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const deriveId = (brand) => brand?._id || brand?.id || brand?._doc?._id || brand?.uuid || null;
  const deriveName = (brand) => brand?.name || brand?.title || brand?.brandName || "(no name)";
  const deriveLogo = (brand) => brand?.logo || brand?.image || brand?.img || brand?.images?.[0] || "";

  const findFirstArrayOfObjects = (obj, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 2) return null;
    if (Array.isArray(obj) && obj.length && typeof obj[0] === "object") return obj;
    if (Array.isArray(obj)) return obj;

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
    }

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const found = findFirstArrayOfObjects(value, depth + 1);
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
        const value = payload.data[key];
        if (Array.isArray(value)) return value;
      }
    }

    const candidates = [payload.items, payload.docs, payload.result, payload.rows, payload.list];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    const deep = findFirstArrayOfObjects(payload);
    return Array.isArray(deep) ? deep : [];
  };

  const fetchBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/brand/all`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store"
      });
      if (resp.status === 304) return;

      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load brands");

      const arrayData = pickArray(data);
      setBrands(Array.isArray(arrayData) ? arrayData : []);
    } catch (err) {
      setBrands([]);
      setError(err.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBrands = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/brand/active`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store"
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) return;
      const arrayData = pickArray(data);
      setActiveBrands(Array.isArray(arrayData) ? arrayData : []);
    } catch {
      setActiveBrands([]);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Missing brand id");
      return;
    }
    if (!window.confirm("Delete this brand?")) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/brand/delete/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() }
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await Promise.all([fetchBrands(), fetchActiveBrands()]);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchActiveBrands();
  }, []);

  const activeIdSet = useMemo(() => {
    const set = new Set();
    activeBrands.forEach((brand) => {
      const id = deriveId(brand);
      if (id) set.add(String(id));
    });
    return set;
  }, [activeBrands]);

  const normalizedBrands = useMemo(
    () =>
      brands
        .map((brand) => {
          const id = deriveId(brand);
          const name = deriveName(brand);
          const logo = deriveLogo(brand);
          return {
            id,
            name,
            logo,
            isActive: id ? activeIdSet.has(String(id)) : false
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [brands, activeIdSet]
  );

  const filteredBrands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return normalizedBrands.filter((brand) => {
      if (viewMode === "active" && !brand.isActive) return false;
      if (!needle) return true;
      return brand.name.toLowerCase().includes(needle);
    });
  }, [normalizedBrands, query, viewMode]);

  const stats = useMemo(
    () => ({
      total: normalizedBrands.length,
      active: normalizedBrands.filter((brand) => brand.isActive).length,
      visible: filteredBrands.length
    }),
    [normalizedBrands, filteredBrands]
  );

  const markImageError = (id) => {
    if (!id) return;
    setImageErrors((prev) => ({
      ...prev,
      [id]: true
    }));
  };

  return (
    <div className="page-container brands-page">
      <div className="page-header fancy brands-header">
        <div className="brands-header-copy">
          <p className="brands-eyebrow">Catalog</p>
          <h2>Brands</h2>
          <p className="muted">Manage brand identity shown across products and listings.</p>
        </div>
        <div className="actions brands-header-actions">
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/dashboard")}>
            ← Back
          </button>
          <button className="btn" type="button" onClick={() => navigate("/admin/brands/new")}>
            + Add New Brand
          </button>
        </div>
      </div>

      <div className="summary-grid brands-summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Brands</span>
          <span className="summary-value">{stats.total}</span>
          <span className="summary-chip">Catalog</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Active Brands</span>
          <span className="summary-value">{stats.active}</span>
          <span className="summary-chip">Live</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Visible Rows</span>
          <span className="summary-value">{stats.visible}</span>
          <span className="summary-chip">Filtered</span>
        </div>
      </div>

      <div className="table-toolbar brands-toolbar">
        <div className="search-input brands-search-input">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brands by name"
          />
          {query && (
            <button
              type="button"
              className="brands-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <div className="pill-row">
          <button
            type="button"
            className={`filter-pill ${viewMode === "all" ? "active" : ""}`}
            onClick={() => setViewMode("all")}
          >
            All
            <span className="pill-count">{stats.total}</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${viewMode === "active" ? "active" : ""}`}
            onClick={() => setViewMode("active")}
          >
            Active
            <span className="pill-count">{stats.active}</span>
          </button>
        </div>
      </div>

      <div className="card table-card brands-table-wrap">
        {error && (
          <div className="error-panel brands-error-panel">
            <p className="error-panel-title">{error}</p>
            <div className="actions">
              <button className="btn" type="button" onClick={fetchBrands}>
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state brands-empty-state">
            <p>Loading brands...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="empty-state brands-empty-state">
            <p>No brands match your filters.</p>
            {(query || viewMode !== "all") && (
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setQuery("");
                  setViewMode("all");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table brands-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map((brand, index) => {
                  const showImage = Boolean(brand.logo && brand.id && !imageErrors[brand.id]);
                  const idSuffix = brand.id ? String(brand.id).slice(-6) : `ROW-${index + 1}`;
                  return (
                    <tr key={brand.id || index}>
                      <td>
                        <div className="brand-main-cell">
                          {showImage ? (
                            <img
                              className="brand-thumb brands-thumb"
                              src={brand.logo}
                              alt={brand.name}
                              loading="lazy"
                              onError={() => markImageError(brand.id)}
                            />
                          ) : (
                            <div className="brand-thumb brands-thumb brands-thumb-fallback" aria-hidden="true">
                              {(brand.name.trim().charAt(0) || "B").toUpperCase()}
                            </div>
                          )}
                          <div className="brand-meta">
                            <strong>{brand.name}</strong>
                            <span>ID: {idSuffix}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${brand.isActive ? "status-active" : "status-neutral"}`}>
                          {brand.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="actions brand-row-actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={!brand.id}
                            onClick={() => navigate(brand.id ? `/admin/brands/${brand.id}` : "/admin/brands")}
                          >
                            Edit
                          </button>
                          <button
                            className="btn danger"
                            type="button"
                            disabled={!brand.id}
                            onClick={() => handleDelete(brand.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandList;
