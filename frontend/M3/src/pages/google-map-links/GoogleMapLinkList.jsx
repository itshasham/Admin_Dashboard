import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../products/product.css";
import "./google-map-links.css";
import { API_BASE_URL } from "../../config/api";

const DEFAULT_PIN = "2742";
const MAP_LINKS_PIN = String(import.meta.env.VITE_MAP_LINKS_PIN || DEFAULT_PIN);
const PIN_SESSION_KEY = "googleMapLinksUnlocked";

const categories = [
  { value: "family", label: "Family" },
  { value: "private", label: "Private" },
];

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.result)) return payload.result;
  return [];
};

const getAuthHeaders = () => {
  try {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const getMapLinkHeaders = (pin) => ({
  ...getAuthHeaders(),
  "x-map-links-pin": pin,
});

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const GoogleMapLinkList = () => {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(PIN_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [form, setForm] = useState({ category: "family", link: "" });

  const visibleLinks = useMemo(() => {
    if (activeCategory === "all") return links;
    return links.filter((item) => item?.category === activeCategory);
  }, [activeCategory, links]);

  const counts = useMemo(() => {
    return links.reduce(
      (acc, item) => {
        if (item?.category === "family") acc.family += 1;
        if (item?.category === "private") acc.private += 1;
        return acc;
      },
      { family: 0, private: 0 }
    );
  }, [links]);

  const unlockLinks = (event) => {
    event.preventDefault();
    if (pin.trim() !== MAP_LINKS_PIN) {
      setPinError("Incorrect PIN");
      return;
    }

    setPinError("");
    setUnlocked(true);
    try {
      sessionStorage.setItem(PIN_SESSION_KEY, "true");
    } catch {
      // Session storage can be unavailable in private browser modes.
    }
  };

  const lockLinks = () => {
    setUnlocked(false);
    setPin("");
    setLinks([]);
    try {
      sessionStorage.removeItem(PIN_SESSION_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const fetchLinks = async () => {
    setLoading(true);
    setError("");

    try {
      const resp = await fetch(`${API_BASE_URL}/google-map-links`, {
        headers: getMapLinkHeaders(MAP_LINKS_PIN),
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to load Google Maps links");
      setLinks(pickArray(data));
    } catch (err) {
      setLinks([]);
      setError(err.message || "Failed to load Google Maps links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) fetchLinks();
  }, [unlocked]);

  const addLink = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const resp = await fetch(`${API_BASE_URL}/google-map-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getMapLinkHeaders(MAP_LINKS_PIN),
        },
        body: JSON.stringify(form),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to add Google Maps link");

      setForm((prev) => ({ ...prev, link: "" }));
      await fetchLinks();
    } catch (err) {
      setError(err.message || "Failed to add Google Maps link");
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this Google Maps link?")) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/google-map-links/${id}`, {
        method: "DELETE",
        headers: getMapLinkHeaders(MAP_LINKS_PIN),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchLinks();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  if (!unlocked) {
    return (
      <div className="page-container map-links-page">
        <div className="page-header products-header fancy">
          <div className="products-header-copy">
            <p className="products-eyebrow">Security</p>
            <h2>Map Links</h2>
            <p className="muted">Enter the PIN to view and manage stored Google Maps links.</p>
          </div>
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/dashboard")}>
            Back
          </button>
        </div>

        <form className="card pin-card" onSubmit={unlockLinks}>
          <div>
            <span className="summary-label">Protected Area</span>
            <h3>Enter PIN</h3>
            <p className="muted">Default PIN is configured as 2742.</p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Enter PIN"
            aria-label="Map links PIN"
          />
          {pinError && <div className="error">{pinError}</div>}
          <button className="btn" type="submit">Unlock Links</button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-container map-links-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Security</p>
          <h2>Map Links</h2>
          <p className="muted">Store Google Maps links under family and private categories.</p>
        </div>
        <div className="header-side">
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/dashboard")}>
            Back
          </button>
          <button className="btn secondary" type="button" onClick={lockLinks}>
            Lock
          </button>
          <button className="btn" type="button" onClick={fetchLinks}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-panel"><p className="error-panel-title">{error}</p></div>}

      <section className="products-summary">
        <article className="summary-card">
          <span className="summary-label">Total Links</span>
          <strong className="summary-value">{links.length}</strong>
          <span className="summary-chip">Stored</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Family</span>
          <strong className="summary-value">{counts.family}</strong>
          <span className="summary-chip">Category</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Private</span>
          <strong className="summary-value">{counts.private}</strong>
          <span className="summary-chip">Category</span>
        </article>
      </section>

      <form className="card map-link-form" onSubmit={addLink}>
        <div className="form-cell map-link-category-cell">
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            aria-label="Map link category"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
        </div>
        <input
          type="url"
          value={form.link}
          onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
          placeholder="https://www.google.com/maps/..."
          required
        />
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add Link"}
        </button>
      </form>

      <section className="card products-filter-bar">
        <div className="pill-row">
          {["all", "family", "private"].map((category) => (
            <button
              key={category}
              type="button"
              className={`filter-pill ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category === "all" ? "All" : category}
            </button>
          ))}
        </div>
        <span className="muted">Showing {visibleLinks.length} links</span>
      </section>

      <section className="card products-table-wrap">
        {loading ? (
          <div className="product-list-state">Loading links...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Google Maps Link</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLinks.map((item, index) => {
                  const id = item?._id || item?.id;
                  return (
                    <tr key={id || index}>
                      <td><span className="inline-badge">{item?.category || "-"}</span></td>
                      <td className="map-link-url">
                        <a href={item?.link} target="_blank" rel="noreferrer">{item?.link}</a>
                      </td>
                      <td>{formatDate(item?.createdAt)}</td>
                      <td>
                        <div className="actions">
                          <a className="btn secondary" href={item?.link} target="_blank" rel="noreferrer">Open</a>
                          <button className="btn danger" type="button" disabled={!id} onClick={() => deleteLink(id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!visibleLinks.length && (
                  <tr>
                    <td colSpan={4} className="muted">No links found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default GoogleMapLinkList;
