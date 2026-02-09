import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import "./coupon.css";
import { API_BASE_URL } from '../../config/api';

const emptyCoupon = {
  title: "",
  logo: "",
  couponCode: "",
  startTime: "",
  endTime: "",
  discountPercentage: 0,
  minimumAmount: 0,
  productType: "",
  status: "active",
};

const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDateTime = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const h = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `${y}-${m}-${day}T${h}:${min}`;
  } catch { return ""; }
};
const nowLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
};
const plusMinutesLocal = (localStr, minutes) => {
  try {
    const d = new Date(localStr);
    d.setMinutes(d.getMinutes() + minutes);
    return toLocalDateTime(d);
  } catch { return localStr; }
};
const toISO = (local) => {
  if (!local) return undefined;
  try { return new Date(local).toISOString(); } catch { return undefined; }
};

const Clock = ({ hours, minutes }) => {
  const hourDeg = useMemo(() => ((hours % 12) + minutes / 60) * 30, [hours, minutes]);
  const minDeg = useMemo(() => minutes * 6, [minutes]);
  return (
    <div style={{ width: 90, height: 90, borderRadius: "50%", border: "2px solid var(--border)", position: "relative", background: "#fff" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 28, background: "var(--ink)", transformOrigin: "bottom center", transform: `translate(-50%, -100%) rotate(${hourDeg}deg)` }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 38, background: "var(--accent)", transformOrigin: "bottom center", transform: `translate(-50%, -100%) rotate(${minDeg}deg)` }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
    </div>
  );
};

const CouponForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [coupon, setCoupon] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [productTypes, setProductTypes] = useState([]);

  // time controls
  const [startH, setStartH] = useState(0);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(0);
  const [endM, setEndM] = useState(0);

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const loadProductTypes = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/product/all`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) return;
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const types = Array.from(new Set(arr.map(p => (p?.productType || "").trim()).filter(Boolean)));
      setProductTypes(types);
      if (!isEdit && !coupon.productType && types.length) {
        setCoupon(prev => ({ ...prev, productType: types[0] }));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadProductTypes();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        if (isEdit) {
          const resp = await fetch(`${API_BASE_URL}/coupon/${id}`, { headers: { ...getAuthHeaders() } });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data?.message || "Failed to load coupon");
          const payload = data?.data || data || emptyCoupon;
          const startLocal = toLocalDateTime(payload.startTime) || nowLocal();
          const endLocal = toLocalDateTime(payload.endTime) || plusMinutesLocal(startLocal, 60);
          setCoupon({
            title: payload.title || "",
            logo: payload.logo || "",
            couponCode: payload.couponCode || "",
            startTime: startLocal,
            endTime: endLocal,
            discountPercentage: payload.discountPercentage ?? 0,
            minimumAmount: payload.minimumAmount ?? 0,
            productType: payload.productType || "",
            status: payload.status || "active",
          });
          const sD = new Date(startLocal); setStartH(sD.getHours()); setStartM(sD.getMinutes());
          const eD = new Date(endLocal); setEndH(eD.getHours()); setEndM(eD.getMinutes());
        } else {
          const startLocal = nowLocal();
          const endLocal = plusMinutesLocal(startLocal, 60);
          setCoupon(prev => ({ ...prev, startTime: startLocal, endTime: endLocal }));
          const sD = new Date(startLocal); setStartH(sD.getHours()); setStartM(sD.getMinutes());
          const eD = new Date(endLocal); setEndH(eD.getHours()); setEndM(eD.getMinutes());
        }
      } catch (err) {
        setError(err.message || "Failed to load coupon");
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const syncStartFromSliders = (h, m) => {
    setStartH(h); setStartM(m);
    try {
      const d = new Date(coupon.startTime || nowLocal());
      d.setHours(h); d.setMinutes(m); d.setSeconds(0);
      setCoupon(prev => ({ ...prev, startTime: toLocalDateTime(d) }));
    } catch {}
  };
  const syncEndFromSliders = (h, m) => {
    setEndH(h); setEndM(m);
    try {
      const d = new Date(coupon.endTime || plusMinutesLocal(nowLocal(), 60));
      d.setHours(h); d.setMinutes(m); d.setSeconds(0);
      setCoupon(prev => ({ ...prev, endTime: toLocalDateTime(d) }));
    } catch {}
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCoupon((prev) => ({ ...prev, [name]: value }));
    if (name === "startTime") {
      try { const d = new Date(value); setStartH(d.getHours()); setStartM(d.getMinutes()); } catch {}
    }
    if (name === "endTime") {
      try { const d = new Date(value); setEndH(d.getHours()); setEndM(d.getMinutes()); } catch {}
    }
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
    return "Validation error. Please check your inputs.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const method = isEdit ? "PATCH" : "POST";
      const url = isEdit ? `${API_BASE_URL}/coupon/${id}` : `${API_BASE_URL}/coupon/add`;
      const payload = {
        title: coupon.title,
        logo: coupon.logo,
        couponCode: coupon.couponCode,
        startTime: toISO(coupon.startTime),
        endTime: toISO(coupon.endTime),
        discountPercentage: Number(coupon.discountPercentage) || 0,
        minimumAmount: Number(coupon.minimumAmount) || 0,
        productType: coupon.productType,
        status: coupon.status,
      };
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => ({})) : {};
      if (!resp.ok) throw new Error(resp.status === 400 ? extractValidationMessage(data) : (data?.message || "Save failed"));
      window.location.href = "/admin/coupons";
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
          <h2>{isEdit ? "Edit Coupon" : "New Coupon"}</h2>
          <p className="muted">Design attractive, time-bound offers that convert better</p>
        </div>
        <div className="header-side">
          <div className="coupon-preview-card">
            <div className="coupon-preview-meta">
              <span className="coupon-preview-title">{coupon.title || "Untitled Offer"}</span>
              <span className="coupon-preview-chip">{coupon.status || "active"}</span>
            </div>
            <div className="coupon-preview-code">{coupon.couponCode || "YOURCODE"}</div>
            <div className="coupon-preview-foot">
              <span>{coupon.discountPercentage || 0}% off</span>
              <span>Min {coupon.minimumAmount || 0}</span>
            </div>
          </div>
          <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="coupon-form-shell">
        <div className="coupon-side">
          <div className="card coupon-preview-panel">
            <div className="coupon-preview-meta">
              <span className="coupon-preview-title">{coupon.title || "Untitled Offer"}</span>
              <span className="coupon-preview-chip">{coupon.status || "active"}</span>
            </div>
            <div className="coupon-preview-code">{coupon.couponCode || "YOURCODE"}</div>
            <div className="coupon-preview-foot">
              <span>{coupon.discountPercentage || 0}% off</span>
              <span>Min {coupon.minimumAmount || 0}</span>
            </div>
            <div className="coupon-preview-divider" />
            <div className="coupon-preview-lines">
              <div>
                <span>Start</span>
                <strong>{coupon.startTime ? new Date(coupon.startTime).toLocaleString() : "Not set"}</strong>
              </div>
              <div>
                <span>End</span>
                <strong>{coupon.endTime ? new Date(coupon.endTime).toLocaleString() : "Not set"}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{coupon.productType || "All products"}</strong>
              </div>
            </div>
          </div>

          <div className="card coupon-logo-card">
            <div className="section-title">
              <h3>Branding</h3>
              <span className="hint">Optional logo</span>
            </div>
            <input name="logo" value={coupon.logo} onChange={handleChange} placeholder="Paste image URL" />
            <div className="preview-row">
              <div className="preview">
                {coupon.logo ? (
                  <img src={coupon.logo} alt="Logo" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <div className="preview-placeholder">No logo</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card compact coupon-form-card">
          <form onSubmit={handleSubmit} className="coupon-form-grid">
            <div className="section appear">
              <div className="section-title">
                <h3>Offer Details</h3>
                <span className="hint">Name, code, discount</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Title</div>
                  <div className="form-cell"><input name="title" value={coupon.title} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Coupon Code</div>
                  <div className="form-cell"><input name="couponCode" value={coupon.couponCode} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Discount %</div>
                  <div className="form-cell"><input name="discountPercentage" type="number" value={coupon.discountPercentage} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Minimum Amount</div>
                  <div className="form-cell"><input name="minimumAmount" type="number" value={coupon.minimumAmount} onChange={handleChange} /></div>
                </div>
              </div>
            </div>

            <div className="section appear">
              <div className="section-title">
                <h3>Eligibility</h3>
                <span className="hint">Target audience</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Product Type</div>
                  <div className="form-cell">
                    {productTypes.length ? (
                      <select name="productType" value={coupon.productType} onChange={handleChange}>
                        {productTypes.map((pt) => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </select>
                    ) : (
                      <input name="productType" value={coupon.productType} onChange={handleChange} placeholder="e.g., electronics" />
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Status</div>
                  <div className="form-cell"><select name="status" value={coupon.status} onChange={handleChange}><option value="active">active</option><option value="inactive">inactive</option></select></div>
                </div>
              </div>
            </div>

            <div className="section appear" style={{ gridColumn: '1 / -1' }}>
              <div className="section-title">
                <h3>Schedule</h3>
                <span className="hint">Control when the offer runs</span>
              </div>
              <div className="schedule-grid">
                <div className="schedule-card">
                  <label>Start Time</label>
                  <input name="startTime" type="datetime-local" value={coupon.startTime} onChange={handleChange} />
                  <div className="time-row">
                    <Clock hours={startH} minutes={startM} />
                    <div className="slider-stack">
                      <label>Hour: {startH}</label>
                      <input type="range" min={0} max={23} value={startH} onChange={(e) => syncStartFromSliders(Number(e.target.value), startM)} />
                      <label>Minute: {pad2(startM)}</label>
                      <input type="range" min={0} max={59} value={startM} onChange={(e) => syncStartFromSliders(startH, Number(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="schedule-card">
                  <label>End Time</label>
                  <input name="endTime" type="datetime-local" value={coupon.endTime} onChange={handleChange} />
                  <div className="time-row">
                    <Clock hours={endH} minutes={endM} />
                    <div className="slider-stack">
                      <label>Hour: {endH}</label>
                      <input type="range" min={0} max={23} value={endH} onChange={(e) => syncEndFromSliders(Number(e.target.value), endM)} />
                      <label>Minute: {pad2(endM)}</label>
                      <input type="range" min={0} max={59} value={endM} onChange={(e) => syncEndFromSliders(endH, Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky-actions appear" style={{ gridColumn: '1 / -1' }}>
              <div className="actions">
                <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Coupon"}</button>
                <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/coupons")}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CouponForm;
