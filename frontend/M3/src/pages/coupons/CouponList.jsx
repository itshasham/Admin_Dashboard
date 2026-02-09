import React, { useEffect, useMemo, useState } from "react";
import "./coupon.css";

const API_BASE_URL = " http://localhost:7001/api";

const CouponList = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.coupons)) return payload.coupons;
    return [];
  };

  const fetchCoupons = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/coupon`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load coupons");
      setCoupons(pickArray(data));
    } catch (err) {
      setError(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return alert("Missing coupon id");
    if (!window.confirm("Delete this coupon?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/coupon/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchCoupons();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const filteredCoupons = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const statusValue = String(coupon?.status || "").toLowerCase();
      if (statusFilter !== "all" && statusValue !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [
        coupon?.title,
        coupon?.couponCode,
        coupon?.productType,
        coupon?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [coupons, query, statusFilter]);

  const stats = useMemo(() => {
    const active = coupons.filter((c) => String(c?.status || "").toLowerCase() === "active").length;
    const inactive = coupons.filter((c) => String(c?.status || "").toLowerCase() === "inactive").length;
    const expiringSoon = coupons.filter((c) => {
      if (!c?.endTime) return false;
      const end = new Date(c.endTime).getTime();
      if (Number.isNaN(end)) return false;
      return end - Date.now() <= 7 * 24 * 60 * 60 * 1000 && end > Date.now();
    }).length;
    return { active, inactive, expiringSoon };
  }, [coupons]);

  const fmt = (d) => {
    try { return d ? new Date(d).toLocaleString() : ""; } catch { return d || ""; }
  };

  const statusClass = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "active") return "status-badge status-active";
    if (value === "inactive") return "status-badge status-inactive";
    return "status-badge status-neutral";
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>Coupons</h2>
          <p className="muted">Create timed offers and track active promotions</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => (window.location.href = "/admin/coupons/new")}>+ Add New Coupon</button>
        </div>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Coupons</span>
          <span className="summary-value">{coupons.length}</span>
          <span className="summary-chip">{filteredCoupons.length} visible</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Active</span>
          <span className="summary-value">{stats.active}</span>
          <span className="summary-chip">Running</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Inactive</span>
          <span className="summary-value">{stats.inactive}</span>
          <span className="summary-chip">Paused</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Expiring Soon</span>
          <span className="summary-value">{stats.expiringSoon}</span>
          <span className="summary-chip">7 days</span>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-input">
          <input
            type="search"
            placeholder="Search by title, code, or product type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="pill-row">
          {["all", "active", "inactive"].map((status) => (
            <button
              key={status}
              className={`filter-pill ${statusFilter === status ? "active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Title</th>
                <th>Code</th>
                <th>Discount %</th>
                <th>Min Amount</th>
                <th>Product Type</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((c, idx) => {
                const id = c?._id || c?.id;
                return (
                  <tr key={id || idx}>
                    <td>
                      {c?.logo ? (
                        <img className="brand-thumb" src={c.logo} alt={c?.title || "coupon"} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      ) : (
                        <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                      )}
                    </td>
                    <td>{c?.title || "-"}</td>
                    <td>{c?.couponCode || "-"}</td>
                    <td>{c?.discountPercentage ?? "-"}</td>
                    <td>{c?.minimumAmount ?? "-"}</td>
                    <td>{c?.productType || "-"}</td>
                    <td><span className={statusClass(c?.status)}>{c?.status || "-"}</span></td>
                    <td>{fmt(c?.startTime)}</td>
                    <td>{fmt(c?.endTime)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn" disabled={!id} onClick={() => (window.location.href = id ? `/admin/coupons/${id}` : "/admin/coupons")}>Edit</button>
                        <button className="btn danger" disabled={!id} onClick={() => handleDelete(id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filteredCoupons.length && (
          <div className="empty-state">
            <p>No coupons match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponList;
