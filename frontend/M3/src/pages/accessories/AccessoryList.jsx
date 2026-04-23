import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.accessories)) return payload.accessories;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const formatPKR = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "PKR 0.00";
  return `PKR ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const AccessoryList = () => {
  const navigate = useNavigate();
  const [accessories, setAccessories] = useState([]);
  const [selectedParent, setSelectedParent] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const [featureSavingIds, setFeatureSavingIds] = useState({});

  const getAuthHeaders = useCallback(() => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, []);

  const normalizeParent = (item) => String(item?.parent || "").trim() || "Uncategorized";

  const fetchAccessories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE_URL}/accessories`);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "500");

      const resp = await fetch(url.toString(), {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load accessories");

      setAccessories(pickArray(data));
      setImageErrors({});
    } catch (err) {
      setAccessories([]);
      setError(err?.message || "Failed to load accessories");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  const markImageError = (id) => {
    if (!id) return;
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const parentOptions = useMemo(() => {
    const map = new Map();
    accessories.forEach((item) => {
      const parent = normalizeParent(item);
      map.set(parent, (map.get(parent) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accessories]);

  const filteredAccessories = useMemo(() => {
    if (selectedParent === "all") return accessories;
    return accessories.filter((item) => normalizeParent(item) === selectedParent);
  }, [accessories, selectedParent]);

  const stats = useMemo(() => {
    const prices = filteredAccessories
      .map((item) => Number(item?.price))
      .filter((price) => Number.isFinite(price) && price > 0);
    return {
      total: filteredAccessories.length,
      avg: prices.length ? prices.reduce((sum, current) => sum + current, 0) / prices.length : 0,
      max: prices.length ? Math.max(...prices) : 0,
    };
  }, [filteredAccessories]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this accessory?")) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/accessories/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchAccessories();
    } catch (err) {
      alert(err?.message || "Delete failed");
    }
  };

  const isFeatured = (item) => Boolean(item?.featured ?? item?.feature);

  const handleToggleFeatured = async (item) => {
    const id = item?._id || item?.id;
    if (!id) return;

    const nextFeature = !isFeatured(item);
    setFeatureSavingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const resp = await fetch(`${API_BASE_URL}/accessories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          feature: nextFeature,
          featured: nextFeature,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to update featured status");

      setAccessories((prev) =>
        prev.map((entry) => {
          const entryId = entry?._id || entry?.id;
          if (entryId !== id) return entry;
          return {
            ...entry,
            feature: nextFeature,
            featured: nextFeature,
          };
        })
      );
    } catch (err) {
      alert(err?.message || "Failed to update featured status");
    } finally {
      setFeatureSavingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container products-page">
        <div className="card product-list-state">Loading accessories...</div>
      </div>
    );
  }

  return (
    <div className="page-container products-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Clinic Catalog</p>
          <h2>Accessories</h2>
          <p className="muted">Separate table for clinic accessories, not tied to products.</p>
        </div>
        <div className="header-side">
          <button className="btn secondary" onClick={() => navigate("/admin/dashboard")} type="button">
            ← Back
          </button>
          <button className="btn" onClick={() => navigate("/admin/accessories/new")} type="button">
            + Add Accessory
          </button>
        </div>
      </div>

      {error && (
        <div className="error-panel" role="alert">
          <p className="error-panel-title">{error}</p>
          <div className="actions">
            <button className="btn" type="button" onClick={fetchAccessories}>
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="products-summary">
        <article className="summary-card">
          <span className="summary-label">Total Accessories</span>
          <strong className="summary-value">{stats.total}</strong>
          <span className="summary-chip">In Selected View</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Average Price</span>
          <strong className="summary-value">{formatPKR(stats.avg)}</strong>
          <span className="summary-chip">Current Mix</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Highest Price</span>
          <strong className="summary-value">{formatPKR(stats.max)}</strong>
          <span className="summary-chip">Top Accessory</span>
        </article>
      </section>

      <section className="card products-filter-bar">
        <div className="products-filter-controls">
          <label htmlFor="accessory-parent-filter">Filter by Parent</label>
          <select
            id="accessory-parent-filter"
            value={selectedParent}
            onChange={(event) => setSelectedParent(event.target.value)}
          >
            <option value="all">All Parents ({accessories.length})</option>
            {parentOptions.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.name} ({entry.count})
              </option>
            ))}
          </select>
          {selectedParent !== "all" && (
            <button className="btn secondary" type="button" onClick={() => setSelectedParent("all")}>
              Clear
            </button>
          )}
        </div>
        <span className="muted">
          Showing {filteredAccessories.length} of {accessories.length} accessories
        </span>
      </section>

      <section className="card products-table-wrap">
        {filteredAccessories.length === 0 ? (
          <div className="products-empty">
            <p>
              {accessories.length === 0
                ? "No accessories found."
                : "No accessories found for the selected parent category."}
            </p>
            <div className="actions" style={{ justifyContent: "center" }}>
              {selectedParent !== "all" && (
                <button className="btn secondary" type="button" onClick={() => setSelectedParent("all")}>
                  Clear Filter
                </button>
              )}
              <button className="btn" type="button" onClick={() => navigate("/admin/accessories/new")}>
                + Add Accessory
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table products-table">
              <thead>
                <tr>
                  <th>Accessory</th>
                  <th>Pricing</th>
                  <th>Media</th>
                  <th>Featured</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccessories.map((item, index) => {
                  const id = item?._id || item?.id;
                  const title = item?.title || "(no title)";
                  const image =
                    item?.img ||
                    (Array.isArray(item?.imageURLs) && item.imageURLs[0]) ||
                    "";
                  const showImage = Boolean(image && id && !imageErrors[id]);
                  const discount = Math.max(0, Math.min(100, Number(item?.discount) || 0));
                  const price = Number(item?.price) || 0;
                  const finalPrice = Math.max(0, price - (price * discount) / 100);
                  const featuredOn = isFeatured(item);
                  const featureSaving = Boolean(featureSavingIds[id]);
                  const mediaImages = Array.isArray(item?.imageURLs) ? item.imageURLs.length : 0;
                  const mediaVideos = Array.isArray(item?.videoURLs) ? item.videoURLs.length : 0;

                  return (
                    <tr key={id || index}>
                      <td>
                        <div className="product-cell">
                          {showImage ? (
                            <img
                              className="brand-thumb product-thumb"
                              src={image}
                              alt={title}
                              loading="lazy"
                              onError={() => markImageError(id)}
                            />
                          ) : (
                            <div className="product-thumb product-thumb-placeholder" aria-hidden="true">
                              {(title.trim().charAt(0) || "A").toUpperCase()}
                            </div>
                          )}
                          <div className="product-meta">
                            <strong>{title}</strong>
                            <span>{normalizeParent(item)} / {item?.children || "General"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span className="price-pill">{formatPKR(finalPrice)}</span>
                          <small className="muted">
                            {discount > 0 ? `${discount}% off from ${formatPKR(price)}` : `Base ${formatPKR(price)}`}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: 3 }}>
                          <small>{mediaImages} image URL{mediaImages === 1 ? "" : "s"}</small>
                          <small>{mediaVideos} video URL{mediaVideos === 1 ? "" : "s"}</small>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`feature-toggle-btn ${featuredOn ? "on" : "off"}`}
                          aria-pressed={featuredOn}
                          disabled={!id || featureSaving}
                          onClick={() => handleToggleFeatured(item)}
                        >
                          {featureSaving ? "Saving..." : featuredOn ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td>{item?.status || "in-stock"}</td>
                      <td>
                        <div className="actions product-row-actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={!id}
                            onClick={() => navigate(id ? `/admin/accessories/${id}` : "/admin/accessories")}
                          >
                            Edit
                          </button>
                          <button
                            className="btn danger"
                            type="button"
                            disabled={!id}
                            onClick={() => handleDelete(id)}
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
      </section>
    </div>
  );
};

export default AccessoryList;
