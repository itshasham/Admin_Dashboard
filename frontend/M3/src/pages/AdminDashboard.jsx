import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { API_BASE_URL } from '../config/api';

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
  // Responsive SVG via viewBox.
  const W = 560, H = 240;
  const M = { l: 54, r: 14, t: 18, b: 46 };
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;

  const max = Math.max(...data.map((d) => Number(d.total) || 0), 0);
  const ticks = max === 0 ? [0, 250, 500, 750, 1000] : buildTicks(max, 4);
  const top = max === 0 ? 1000 : (ticks[ticks.length - 1] || 1);

  const xFor = (i) => M.l + (data.length <= 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const yFor = (v) => M.t + innerH - (Math.max(0, Number(v) || 0) / (top || 1)) * innerH;

  const lineD = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(d.total).toFixed(2)}`)
    .join(" ");

  const areaD = `M ${xFor(0).toFixed(2)} ${yFor(0).toFixed(2)} ` +
    data.map((d, i) => `L ${xFor(i).toFixed(2)} ${yFor(d.total).toFixed(2)}`).join(" ") +
    ` L ${xFor(data.length - 1).toFixed(2)} ${yFor(0).toFixed(2)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "240px", display: "block" }}>
      <defs>
        <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(15,118,110,0.35)" />
          <stop offset="1" stopColor="rgba(15,118,110,0.02)" />
        </linearGradient>
      </defs>

      {/* Grid + Y ticks */}
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#52617a">
              {formatCompact(t)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="#94a3b8" strokeWidth="1" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#94a3b8" strokeWidth="1" />

      {/* Series */}
      <path d={areaD} fill="url(#salesFill)" />
      <path d={lineD} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(d.total)} r="4" fill="#0f766e" stroke="#ffffff" strokeWidth="2">
          <title>{`${d.label}: ${Number(d.total) || 0}`}</title>
        </circle>
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={xFor(i)}
          y={H - M.b + 18}
          textAnchor="middle"
          fontSize="11"
          fill="#52617a"
        >
          {d.label}
        </text>
      ))}

      <text x={M.l} y={H - 10} fontSize="11" fill="#52617a">Date (MM-DD)</text>
      <text x={14} y={M.t + 10} fontSize="11" fill="#52617a">Sales</text>
    </svg>
  );
};

const CategoryChart = ({ data }) => {
  const W = 560, H = 240;
  const M = { l: 54, r: 14, t: 18, b: 64 };
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;

  const max = Math.max(...data.map((d) => Number(d.count) || 0), 0);
  const ticks = max === 0 ? [0, 1, 2, 3, 4, 5] : buildTicks(max, 4);
  const top = max === 0 ? 5 : (ticks[ticks.length - 1] || 1);

  const n = Math.max(1, data.length);
  const gap = 10;
  const barW = Math.max(14, Math.floor((innerW - gap * (n - 1)) / n));
  const xFor = (i) => M.l + i * (barW + gap);
  const yFor = (v) => M.t + innerH - (Math.max(0, Number(v) || 0) / (top || 1)) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "240px", display: "block" }}>
      {/* Grid + Y ticks */}
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#52617a">
              {formatCompact(t)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="#94a3b8" strokeWidth="1" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#94a3b8" strokeWidth="1" />

      {/* Bars */}
      {data.map((c, i) => {
        const v = Number(c.count) || 0;
        const x = xFor(i);
        const y = yFor(v);
        const h = (H - M.b) - y;
        const label = String(c._id || "—");
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx="6" fill="#f97316">
              <title>{`${label}: ${v}`}</title>
            </rect>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#0f172a">
              {v}
            </text>
            <text
              x={x + barW / 2}
              y={H - M.b + 18}
              textAnchor="end"
              fontSize="11"
              fill="#52617a"
              transform={`rotate(-35 ${x + barW / 2} ${H - M.b + 18})`}
            >
              {label.length > 14 ? `${label.slice(0, 14)}…` : label}
            </text>
          </g>
        );
      })}

      <text x={M.l} y={H - 10} fontSize="11" fill="#52617a">Category</text>
      <text x={14} y={M.t + 10} fontSize="11" fill="#52617a">Qty</text>
    </svg>
  );
};

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // dashboard data
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
  const [salesReport, setSalesReport] = useState(buildLast7Days()); // [{ date, total, order }]
  const [categoryData, setCategoryData] = useState([]); // [{ _id, count }]
  const [recentOrders, setRecentOrders] = useState({ orders: [], totalOrder: 0 });

  const navigate = useNavigate();

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem('adminToken');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const storedAdminData = localStorage.getItem('adminData');

    if (!token) {
      navigate('/admin/login');
      return;
    }

    if (storedAdminData) {
      try {
        setAdminData(JSON.parse(storedAdminData));
      } catch (error) {
        console.error('Error parsing admin data:', error);
      }
    }

    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  const canAccessStaffManagement = () => {
    if (!adminData) return false;
    return ['Manager', 'CEO'].includes(adminData.role);
  };

  const canViewCustomers = () => adminData?.role === "CEO";

  // Fetch user-order dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // amounts
        const aResp = await fetch(`${API_BASE_URL}/user-order/dashboard-amount`, {
          headers: { ...getAuthHeaders() },
          cache: 'no-store',
        });
        const aJson = (aResp.headers.get('content-type') || '').includes('application/json') ? await aResp.json() : {};
        if (aResp.ok && aJson) setAmounts((prev) => ({ ...prev, ...aJson }));

        // sales report (last 7 days)
        const sResp = await fetch(`${API_BASE_URL}/user-order/sales-report`, {
          headers: { ...getAuthHeaders() },
          cache: 'no-store',
        });
        const sJson = (sResp.headers.get('content-type') || '').includes('application/json') ? await sResp.json() : {};
        if (sResp.ok && Array.isArray(sJson?.salesReport)) {
          // Always show last 7 days on X axis (including 0s for missing days).
          const map = new Map((sJson.salesReport || []).map((r) => [String(r?.date || ""), r]));
          const today = new Date();
          const series = [];
          for (let i = 6; i >= 0; i--) {
            const d = addDays(today, -i);
            const iso = toISODate(d);
            const row = map.get(iso);
            series.push({
              date: iso,
              label: iso.slice(5), // MM-DD
              total: Number(row?.total) || 0,
              order: Number(row?.order) || 0,
            });
          }
          setSalesReport(series);
        }

        // most selling categories
        const cResp = await fetch(`${API_BASE_URL}/user-order/most-selling-category`, {
          headers: { ...getAuthHeaders() },
          cache: 'no-store',
        });
        const cJson = (cResp.headers.get('content-type') || '').includes('application/json') ? await cResp.json() : {};
        if (cResp.ok && Array.isArray(cJson?.categoryData)) setCategoryData(cJson.categoryData);

        // recent orders
        const rUrl = new URL(`${API_BASE_URL}/user-order/dashboard-recent-order`);
        rUrl.searchParams.set('page', '1');
        rUrl.searchParams.set('limit', '8');
        const rResp = await fetch(rUrl.toString(), {
          headers: { ...getAuthHeaders() },
          cache: 'no-store',
        });
        const rJson = (rResp.headers.get('content-type') || '').includes('application/json') ? await rResp.json() : {};
        if (rResp.ok && Array.isArray(rJson?.orders)) setRecentOrders({ orders: rJson.orders, totalOrder: rJson.totalOrder || rJson.orders.length });
      } catch (e) {
        setError('Failed to load dashboard metrics');
      }
    };
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxSales = Math.max(...salesReport.map((s) => Number(s.total) || 0), 1);
  const maxCat = Math.max(...categoryData.map((c) => Number(c.count) || 0), 1);
  const formatAmount = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return "0";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  };
  const toPercent = (part, total) => {
    if (total <= 0) return 50;
    return Math.round((part / total) * 100);
  };
  const todayTotalPayment = Number(amounts.todayCardPaymentAmount || 0) + Number(amounts.todayCashPaymentAmount || 0);
  const yesterdayTotalPayment = Number(amounts.yesterDayCardPaymentAmount || 0) + Number(amounts.yesterDayCashPaymentAmount || 0);
  const statusTone = (status = "") => {
    const value = String(status).toLowerCase();
    if (value === "dispatch" || value === "delivered" || value === "dispatched") return "success";
    if (value === "processing") return "info";
    if (value === "cancel" || value === "cancelled" || value === "canceled") return "danger";
    return "warn";
  };
  const fmtDate = (value) => {
    try { return value ? new Date(value).toLocaleDateString() : "-"; } catch { return value || "-"; }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <div className="admin-info">
            <span>Welcome, {adminData?.name || 'Admin'}</span>
            <span className="user-role-badge">Role: {adminData?.role || 'Unknown'}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-sidebar">
          <nav className="admin-nav">
            <button onClick={() => navigateTo('/admin/dashboard')} className="nav-item active">Dashboard</button>
            {canAccessStaffManagement() && (
              <button onClick={() => navigateTo('/admin/staff')} className="nav-item">Staff Management</button>
            )}
            {canViewCustomers() && (
              <button onClick={() => navigateTo('/admin/users')} className="nav-item">Customers</button>
            )}
            <button onClick={() => navigateTo('/admin/products')} className="nav-item">Products</button>
            <button onClick={() => navigateTo('/admin/clinical-products')} className="nav-item">Clinical Products</button>
            <button onClick={() => navigateTo('/admin/machines')} className="nav-item">Machines</button>
            <button onClick={() => navigateTo('/admin/orders')} className="nav-item">Orders</button>
            <button onClick={() => navigateTo('/admin/brands')} className="nav-item">Brands</button>
            <button onClick={() => navigateTo('/admin/categories')} className="nav-item">Categories</button>
            <button onClick={() => navigateTo('/admin/coupons')} className="nav-item">Coupons</button>
            <button onClick={() => navigateTo('/admin/cloudinary')} className="nav-item">Image Manager</button>
            <button onClick={() => navigateTo('/admin/settings')} className="nav-item">Settings</button>
          </nav>
        </div>

        <div className="admin-content">
          {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Today Order Amount</h3>
              <p className="stat-number">{formatAmount(amounts.todayOrderAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>Yesterday Order Amount</h3>
              <p className="stat-number">{formatAmount(amounts.yesterdayOrderAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>Monthly Order Amount</h3>
              <p className="stat-number">{formatAmount(amounts.monthlyOrderAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>Total Order Amount</h3>
              <p className="stat-number">{formatAmount(amounts.totalOrderAmount)}</p>
            </div>
          </div>

          <div className="insight-grid">
            <div className="card split-card">
              <div className="card-header">
                <h2>Today Payment Mix</h2>
                <span className="meta-pill">{formatAmount(todayTotalPayment)} total</span>
              </div>
              <div className="split-bar">
                <div className="split-fill" style={{ width: `${toPercent(amounts.todayCardPaymentAmount, todayTotalPayment)}%` }}>
                  <span>Card</span>
                  <strong>{formatAmount(amounts.todayCardPaymentAmount)}</strong>
                </div>
                <div className="split-fill cash" style={{ width: `${toPercent(amounts.todayCashPaymentAmount, todayTotalPayment)}%` }}>
                  <span>Cash</span>
                  <strong>{formatAmount(amounts.todayCashPaymentAmount)}</strong>
                </div>
              </div>
            </div>
            <div className="card split-card">
              <div className="card-header">
                <h2>Yesterday Payment Mix</h2>
                <span className="meta-pill">{formatAmount(yesterdayTotalPayment)} total</span>
              </div>
              <div className="split-bar">
                <div className="split-fill" style={{ width: `${toPercent(amounts.yesterDayCardPaymentAmount, yesterdayTotalPayment)}%` }}>
                  <span>Card</span>
                  <strong>{formatAmount(amounts.yesterDayCardPaymentAmount)}</strong>
                </div>
                <div className="split-fill cash" style={{ width: `${toPercent(amounts.yesterDayCashPaymentAmount, yesterdayTotalPayment)}%` }}>
                  <span>Cash</span>
                  <strong>{formatAmount(amounts.yesterDayCashPaymentAmount)}</strong>
                </div>
              </div>
            </div>
            <div className="card snapshot-card">
              <div className="card-header">
                <h2>Order Snapshot</h2>
                <span className="meta-pill">{recentOrders.totalOrder} recent orders</span>
              </div>
              <div className="snapshot-grid">
                <div>
                  <span>Avg Order</span>
                  <strong>{formatAmount(recentOrders.totalOrder ? amounts.totalOrderAmount / recentOrders.totalOrder : 0)}</strong>
                </div>
                <div>
                  <span>Today Orders</span>
                  <strong>{formatAmount(amounts.todayOrderAmount)}</strong>
                </div>
                <div>
                  <span>Monthly Orders</span>
                  <strong>{formatAmount(amounts.monthlyOrderAmount)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid-two">
            <div className="card chart-card">
              <div className="card-header"><h2>Last 7 Days Sales</h2></div>
              <SalesChart data={salesReport} />
            </div>

            <div className="card chart-card">
              <div className="card-header"><h2>Top Categories</h2></div>
              <CategoryChart data={categoryData} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><h2>Recent Orders</h2></div>
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
                      <td>{formatAmount(o.totalAmount)}</td>
                      <td><span className={`status-pill status-${statusTone(o.status)}`}>{o.status || "pending"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
