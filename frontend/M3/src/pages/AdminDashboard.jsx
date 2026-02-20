import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import { API_BASE_URL } from "../config/api";

const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const addDays = (d, days) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
};
const formatCompact = (n) => {
  const num = Number(n) || 0;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.round(num));
};
const niceStep = (max, ticks = 5) => {
  const m = Math.max(0, Number(max) || 0);
  if (m === 0) return 1;
  const raw = m / Math.max(1, ticks);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * pow;
};
const buildTicks = (max, ticks = 5) => {
  const step = niceStep(max, ticks);
  const top = Math.ceil((Number(max) || 0) / step) * step;
  const out = [];
  for (let v = 0; v <= top + 0.0001; v += step) out.push(v);
  return out;
};
const buildLast7Days = () => {
  const today = new Date();
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const iso = toISODate(d);
    series.push({ date: iso, label: iso.slice(5), total: 0, order: 0 });
  }
  return series;
};

const SalesChart = ({ data }) => {
  const W = 560;
  const H = 240;
  const M = { l: 54, r: 14, t: 16, b: 46 };
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;

  const max = Math.max(...data.map((d) => Number(d.total) || 0), 0);
  const ticks = max === 0 ? [0, 250, 500, 750, 1000] : buildTicks(max, 4);
  const top = max === 0 ? 1000 : ticks[ticks.length - 1] || 1;
  const xFor = (i) => M.l + (data.length <= 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const yFor = (v) => M.t + innerH - (Math.max(0, Number(v) || 0) / (top || 1)) * innerH;

  const lineD = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(d.total).toFixed(2)}`)
    .join(" ");
  const areaD =
    `M ${xFor(0).toFixed(2)} ${yFor(0).toFixed(2)} ` +
    data.map((d, i) => `L ${xFor(i).toFixed(2)} ${yFor(d.total).toFixed(2)}`).join(" ") +
    ` L ${xFor(data.length - 1).toFixed(2)} ${yFor(0).toFixed(2)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "240px", display: "block" }}>
      <defs>
        <linearGradient id="salesAuraFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(188, 144, 95, 0.35)" />
          <stop offset="1" stopColor="rgba(188, 144, 95, 0.02)" />
        </linearGradient>
      </defs>

      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="rgba(93, 78, 67, 0.16)" strokeWidth="1" />
            <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6f5d50">
              {formatCompact(t)}
            </text>
          </g>
        );
      })}

      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="rgba(93, 78, 67, 0.36)" strokeWidth="1" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="rgba(93, 78, 67, 0.36)" strokeWidth="1" />

      <path d={areaD} fill="url(#salesAuraFill)" />
      <path d={lineD} fill="none" stroke="#bc905f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(d.total)} r="4" fill="#bc905f" stroke="#fff8f1" strokeWidth="2">
          <title>{`${d.label}: ${Number(d.total) || 0}`}</title>
        </circle>
      ))}

      {data.map((d, i) => (
        <text key={i} x={xFor(i)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#6f5d50">
          {d.label}
        </text>
      ))}
    </svg>
  );
};

const CategoryChart = ({ data }) => {
  const W = 560;
  const H = 240;
  const M = { l: 54, r: 14, t: 16, b: 64 };
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;

  const max = Math.max(...data.map((d) => Number(d.count) || 0), 0);
  const ticks = max === 0 ? [0, 1, 2, 3, 4, 5] : buildTicks(max, 4);
  const top = max === 0 ? 5 : ticks[ticks.length - 1] || 1;

  const n = Math.max(1, data.length);
  const gap = 10;
  const barW = Math.max(14, Math.floor((innerW - gap * (n - 1)) / n));
  const xFor = (i) => M.l + i * (barW + gap);
  const yFor = (v) => M.t + innerH - (Math.max(0, Number(v) || 0) / (top || 1)) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "240px", display: "block" }}>
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="rgba(93, 78, 67, 0.16)" strokeWidth="1" />
            <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6f5d50">
              {formatCompact(t)}
            </text>
          </g>
        );
      })}

      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="rgba(93, 78, 67, 0.36)" strokeWidth="1" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="rgba(93, 78, 67, 0.36)" strokeWidth="1" />

      {data.map((c, i) => {
        const v = Number(c.count) || 0;
        const x = xFor(i);
        const y = yFor(v);
        const h = H - M.b - y;
        const label = String(c._id || "Untitled");
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx="6" fill="#8f7965">
              <title>{`${label}: ${v}`}</title>
            </rect>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#4a3f36">
              {v}
            </text>
            <text
              x={x + barW / 2}
              y={H - M.b + 18}
              textAnchor="end"
              fontSize="11"
              fill="#6f5d50"
              transform={`rotate(-35 ${x + barW / 2} ${H - M.b + 18})`}
            >
              {label.length > 14 ? `${label.slice(0, 14)}...` : label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [amounts, setAmounts] = useState({
    todayOrderAmount: 0,
    yesterdayOrderAmount: 0,
    monthlyOrderAmount: 0,
    totalOrderAmount: 0,
    todayCardPaymentAmount: 0,
    todayCashPaymentAmount: 0,
    yesterDayCardPaymentAmount: 0,
    yesterDayCashPaymentAmount: 0,
  });
  const [salesReport, setSalesReport] = useState(buildLast7Days());
  const [categoryData, setCategoryData] = useState([]);
  const [recentOrders, setRecentOrders] = useState({ orders: [], totalOrder: 0 });

  const navigate = useNavigate();

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const storedAdminData = localStorage.getItem("adminData");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    if (storedAdminData) {
      try {
        setAdminData(JSON.parse(storedAdminData));
      } catch {
        setAdminData(null);
      }
    }

    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    navigate("/admin/login");
  };

  const navigateTo = (path) => navigate(path);
  const canAccessStaffManagement = () => ["Manager", "CEO"].includes(adminData?.role);
  const canViewCustomers = () => adminData?.role === "CEO";

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const getOrderTimestamp = (order) => {
          const raw = order?.createdAt || order?.updatedAt;
          const ts = Date.parse(raw);
          return Number.isFinite(ts) ? ts : 0;
        };

        const aResp = await fetch(`${API_BASE_URL}/user-order/dashboard-amount`, {
          headers: { ...getAuthHeaders() },
          cache: "no-store",
        });
        const aJson = (aResp.headers.get("content-type") || "").includes("application/json")
          ? await aResp.json()
          : {};
        if (aResp.ok && aJson) setAmounts((prev) => ({ ...prev, ...aJson }));

        const sResp = await fetch(`${API_BASE_URL}/user-order/sales-report`, {
          headers: { ...getAuthHeaders() },
          cache: "no-store",
        });
        const sJson = (sResp.headers.get("content-type") || "").includes("application/json")
          ? await sResp.json()
          : {};
        if (sResp.ok && Array.isArray(sJson?.salesReport)) {
          const map = new Map((sJson.salesReport || []).map((r) => [String(r?.date || ""), r]));
          const today = new Date();
          const series = [];
          for (let i = 6; i >= 0; i--) {
            const d = addDays(today, -i);
            const iso = toISODate(d);
            const row = map.get(iso);
            series.push({
              date: iso,
              label: iso.slice(5),
              total: Number(row?.total) || 0,
              order: Number(row?.order) || 0,
            });
          }
          setSalesReport(series);
        }

        const cResp = await fetch(`${API_BASE_URL}/user-order/most-selling-category`, {
          headers: { ...getAuthHeaders() },
          cache: "no-store",
        });
        const cJson = (cResp.headers.get("content-type") || "").includes("application/json")
          ? await cResp.json()
          : {};
        if (cResp.ok && Array.isArray(cJson?.categoryData)) setCategoryData(cJson.categoryData);

        const rUrl = new URL(`${API_BASE_URL}/user-order/dashboard-recent-order`);
        rUrl.searchParams.set("page", "1");
        rUrl.searchParams.set("limit", "8");
        const rResp = await fetch(rUrl.toString(), {
          headers: { ...getAuthHeaders() },
          cache: "no-store",
        });
        const rJson = (rResp.headers.get("content-type") || "").includes("application/json")
          ? await rResp.json()
          : {};
        if (rResp.ok && Array.isArray(rJson?.orders)) {
          const sorted = [...rJson.orders].sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
          setRecentOrders({ orders: sorted, totalOrder: rJson.totalOrder || sorted.length });
        }
      } catch {
        setError("Failed to load dashboard metrics");
      }
    };
    fetchDashboard();
  }, []);

  const formatAmount = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return "0";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  };
  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };
  const percent = (part, total) => {
    if (total <= 0) return 0;
    return Math.round((part / total) * 100);
  };
  const segmentWidth = (part, total) => (total > 0 ? `${percent(part, total)}%` : "50%");
  const todayTotalPayment = Number(amounts.todayCardPaymentAmount || 0) + Number(amounts.todayCashPaymentAmount || 0);
  const yesterdayTotalPayment = Number(amounts.yesterDayCardPaymentAmount || 0) + Number(amounts.yesterDayCashPaymentAmount || 0);
  const orderDelta = Number(amounts.todayOrderAmount || 0) - Number(amounts.yesterdayOrderAmount || 0);
  const orderDeltaPercent = Number(amounts.yesterdayOrderAmount || 0) > 0
    ? ((orderDelta / Number(amounts.yesterdayOrderAmount || 1)) * 100).toFixed(1)
    : null;
  const statusTone = (status = "") => {
    const value = String(status).toLowerCase();
    if (value === "dispatch" || value === "delivered" || value === "dispatched") return "success";
    if (value === "processing") return "info";
    if (value === "cancel" || value === "cancelled" || value === "canceled") return "danger";
    return "warn";
  };
  const fmtDate = (value) => {
    try {
      return value ? new Date(value).toLocaleDateString() : "-";
    } catch {
      return value || "-";
    }
  };
  const navItems = [
    { label: "Dashboard", hint: "Overview", path: "/admin/dashboard", show: true, active: true },
    { label: "Staff Management", hint: "Roles", path: "/admin/staff", show: canAccessStaffManagement() },
    { label: "Customers", hint: "Accounts", path: "/admin/users", show: canViewCustomers() },
    { label: "Products", hint: "Catalog", path: "/admin/products", show: true },
    { label: "Clinical Products", hint: "Treatments", path: "/admin/clinical-products", show: true },
    { label: "Machines", hint: "Devices", path: "/admin/machines", show: true },
    { label: "Orders", hint: "Fulfillment", path: "/admin/orders", show: true },
    { label: "Contact Us", hint: "Leads", path: "/admin/contact-us", show: true },
    { label: "Brands", hint: "Portfolio", path: "/admin/brands", show: true },
    { label: "Categories", hint: "Structure", path: "/admin/categories", show: true },
    { label: "Coupons", hint: "Promotions", path: "/admin/coupons", show: true },
    { label: "Image Manager", hint: "Assets", path: "/admin/cloudinary", show: true },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-shell">
          <div className="loading-dot" />
          <p>Loading your command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="aura-header">
        <div className="aura-header-inner">
          <div>
            <p className="aura-eyebrow">Admin Operations</p>
            <h1>Commerce Control Room</h1>
          </div>
          <div className="aura-header-actions">
            <div className="aura-admin-chip">
              <strong>{adminData?.name || "Admin"}</strong>
              <span>{adminData?.role || "Unknown role"}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="aura-shell">
        <aside className="aura-sidebar glass-panel">
          <p className="aura-kicker">Navigation</p>
          <nav className="aura-nav">
            {navItems.filter((item) => item.show).map((item) => (
              <button
                key={item.path}
                onClick={() => navigateTo(item.path)}
                className={`aura-nav-item${item.active ? " active" : ""}`}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </nav>
        </aside>

        <section className="aura-content">
          {error && <div className="error-banner">{error}</div>}

          <section className="aura-hero glass-panel">
            <div className="aura-hero-copy">
              <p className="aura-kicker">Daily Pulse</p>
              <h2>
                {orderDelta >= 0 ? "Momentum is climbing" : "Momentum is soft today"}
              </h2>
              <p>
                Track sales, payment mix, and fulfillment health in one premium operations view.
              </p>
              <div className="hero-chip-row">
                <span>{recentOrders.totalOrder} recent orders tracked</span>
                <span>{categoryData.length} top categories visible</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            <div className="aura-hero-aside">
              <p>Today vs Yesterday</p>
              <h3>{orderDelta >= 0 ? "+" : ""}{formatCurrency(orderDelta)}</h3>
              <strong>
                {orderDeltaPercent === null
                  ? "No baseline from yesterday"
                  : `${orderDelta >= 0 ? "+" : ""}${orderDeltaPercent}% change`}
              </strong>
              <div className="hero-actions">
                <button onClick={() => navigateTo("/admin/orders")} className="action-btn primary">Review Orders</button>
                <button onClick={() => navigateTo("/admin/products/new")} className="action-btn">Add Product</button>
              </div>
            </div>
          </section>

          <section className="dashboard-stats">
            <article className="stat-card glass-panel">
              <h3>Today Revenue</h3>
              <p className="stat-number">{formatCurrency(amounts.todayOrderAmount)}</p>
            </article>
            <article className="stat-card glass-panel">
              <h3>Yesterday Revenue</h3>
              <p className="stat-number">{formatCurrency(amounts.yesterdayOrderAmount)}</p>
            </article>
            <article className="stat-card glass-panel">
              <h3>Monthly Revenue</h3>
              <p className="stat-number">{formatCurrency(amounts.monthlyOrderAmount)}</p>
            </article>
            <article className="stat-card glass-panel">
              <h3>Total Revenue</h3>
              <p className="stat-number">{formatCurrency(amounts.totalOrderAmount)}</p>
            </article>
          </section>

          <section className="insight-grid">
            <article className="card split-card glass-panel">
              <div className="card-header">
                <h2>Today Payment Mix</h2>
                <span className="meta-pill">{formatCurrency(todayTotalPayment)}</span>
              </div>
              <div className="split-bar">
                <div className="split-fill card-segment" style={{ width: segmentWidth(amounts.todayCardPaymentAmount, todayTotalPayment) }}>
                  <span>Card</span>
                  <strong>{percent(amounts.todayCardPaymentAmount, todayTotalPayment)}%</strong>
                </div>
                <div className="split-fill cash-segment" style={{ width: segmentWidth(amounts.todayCashPaymentAmount, todayTotalPayment) }}>
                  <span>Cash</span>
                  <strong>{percent(amounts.todayCashPaymentAmount, todayTotalPayment)}%</strong>
                </div>
              </div>
            </article>

            <article className="card split-card glass-panel">
              <div className="card-header">
                <h2>Yesterday Payment Mix</h2>
                <span className="meta-pill">{formatCurrency(yesterdayTotalPayment)}</span>
              </div>
              <div className="split-bar">
                <div className="split-fill card-segment" style={{ width: segmentWidth(amounts.yesterDayCardPaymentAmount, yesterdayTotalPayment) }}>
                  <span>Card</span>
                  <strong>{percent(amounts.yesterDayCardPaymentAmount, yesterdayTotalPayment)}%</strong>
                </div>
                <div className="split-fill cash-segment" style={{ width: segmentWidth(amounts.yesterDayCashPaymentAmount, yesterdayTotalPayment) }}>
                  <span>Cash</span>
                  <strong>{percent(amounts.yesterDayCashPaymentAmount, yesterdayTotalPayment)}%</strong>
                </div>
              </div>
            </article>

            <article className="card snapshot-card glass-panel">
              <div className="card-header">
                <h2>Order Snapshot</h2>
                <span className="meta-pill">{recentOrders.totalOrder} recent</span>
              </div>
              <div className="snapshot-grid">
                <div>
                  <span>Avg Ticket</span>
                  <strong>{formatCurrency(recentOrders.totalOrder ? amounts.totalOrderAmount / recentOrders.totalOrder : 0)}</strong>
                </div>
                <div>
                  <span>Today Orders</span>
                  <strong>{formatAmount(amounts.todayOrderAmount)}</strong>
                </div>
                <div>
                  <span>Monthly Orders</span>
                  <strong>{formatAmount(amounts.monthlyOrderAmount)}</strong>
                </div>
                <div>
                  <span>Processing Queue</span>
                  <strong>{recentOrders.orders.filter((o) => String(o.status || "").toLowerCase() === "processing").length}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="grid-two">
            <article className="card chart-card glass-panel">
              <div className="card-header">
                <h2>Last 7 Days Sales</h2>
                <span className="meta-pill">Daily trend</span>
              </div>
              <SalesChart data={salesReport} />
            </article>

            <article className="card chart-card glass-panel">
              <div className="card-header">
                <h2>Top Categories</h2>
                <span className="meta-pill">Demand mix</span>
              </div>
              <CategoryChart data={categoryData} />
            </article>
          </section>

          <section className="card glass-panel orders-card">
            <div className="card-header">
              <h2>Recent Orders</h2>
              <span className="meta-pill">{recentOrders.orders.length} rows</span>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th>Name</th>
                    <th>User</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.orders.map((o, idx) => (
                    <tr key={idx}>
                      <td>{o.invoice}</td>
                      <td>{fmtDate(o.createdAt || o.updatedAt)}</td>
                      <td>{o.paymentMethod}</td>
                      <td>{o.name}</td>
                      <td>{o.user?.name || o.user?.email || o.user?._id || o.user || "-"}</td>
                      <td>{formatCurrency(o.totalAmount)}</td>
                      <td><span className={`status-pill status-${statusTone(o.status)}`}>{o.status || "pending"}</span></td>
                    </tr>
                  ))}
                  {recentOrders.orders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-row">No recent orders available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      <nav className="mobile-dock">
        <button onClick={() => navigateTo("/admin/dashboard")} className="active">Dashboard</button>
        <button onClick={() => navigateTo("/admin/orders")}>Orders</button>
        <button onClick={() => navigateTo("/admin/products")}>Products</button>
        <button onClick={() => navigateTo("/admin/contact-us")}>Contacts</button>
      </nav>
    </div>
  );
};

export default AdminDashboard;
