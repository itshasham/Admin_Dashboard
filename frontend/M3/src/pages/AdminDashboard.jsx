import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const [orderCounts, setOrderCounts] = useState({
    today: 0,
    monthly: 0,
    processing: 0,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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
  const canAccessRestrictedSections = () => ["Manager", "CEO"].includes(adminData?.role);

  useEffect(() => {
    document.title = "NEES Medical Admin";
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const pickOrders = (payload) => {
          if (!payload) return [];
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload?.orders)) return payload.orders;
          if (Array.isArray(payload?.order)) return payload.order;
          if (Array.isArray(payload?.results)) return payload.results;
          if (Array.isArray(payload?.orderItems)) return payload.orderItems;
          if (payload?.data && Array.isArray(payload.data.orders)) return payload.data.orders;
          if (payload?.data && Array.isArray(payload.data.order)) return payload.data.order;
          if (payload?.data && Array.isArray(payload.data.orderItems)) return payload.data.orderItems;
          if (payload?.result && Array.isArray(payload.result.orders)) return payload.result.orders;
          return [];
        };
        const toAmount = (value) => {
          if (value === null || value === undefined) return 0;
          if (typeof value === "string") {
            const normalized = value.replace(/[, ]+/g, "").trim();
            if (!normalized) return 0;
            const parsedFromString = Number(normalized);
            return Number.isFinite(parsedFromString) ? parsedFromString : 0;
          }
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        };
        const parseDate = (value) => {
          const parsed = Date.parse(value);
          return Number.isFinite(parsed) ? parsed : null;
        };
        const pickOrderAmount = (order) => {
          const directAmount = toAmount(
            order?.totalAmount ??
            order?.total ??
            order?.totalPrice ??
            order?.amount ??
            order?.grandTotal
          );
          if (directAmount > 0) return directAmount;

          const fallbackAmount = toAmount(order?.subTotal) + toAmount(order?.shippingCost) - toAmount(order?.discount);
          return fallbackAmount > 0 ? fallbackAmount : 0;
        };
        const pickOrderDate = (order) =>
          order?.createdAt ||
          order?.created_at ||
          order?.updatedAt ||
          order?.updated_at ||
          order?.date ||
          order?.orderDate ||
          null;
        const pickPaymentMethod = (order) =>
          String(
            order?.paymentMethod ||
            order?.payment_method ||
            order?.paymentType ||
            order?.payment?.method ||
            order?.payment?.type ||
            ""
          ).toLowerCase();
        const getOrderTimestamp = (order) => {
          const raw = pickOrderDate(order);
          return parseDate(raw) || 0;
        };
        const endpoints = [
          `${API_BASE_URL}/order/admin/orders`,
          `${API_BASE_URL}/order/orders`,
        ];
        let orders = [];
        let loaded = false;
        let lastError = "Failed to load orders";

        for (const endpoint of endpoints) {
          const ordersResp = await fetch(endpoint, {
            headers: { ...getAuthHeaders() },
            cache: "no-store",
          });
          const ordersJson = (ordersResp.headers.get("content-type") || "").includes("application/json")
            ? await ordersResp.json().catch(() => null)
            : null;

          if (ordersResp.ok) {
            orders = pickOrders(ordersJson).sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
            loaded = true;
            break;
          }

          if (ordersResp.status === 401) {
            throw new Error("Your admin session expired. Please login again.");
          }
          if (ordersResp.status === 403) {
            throw new Error("You are not authorized to access order metrics.");
          }

          lastError = ordersJson?.message || "Failed to load orders";
        }

        if (!loaded) {
          throw new Error(lastError);
        }

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayOrderAmount = 0;
        let yesterdayOrderAmount = 0;
        let monthlyOrderAmount = 0;
        let totalOrderAmount = 0;
        let todayCardPaymentAmount = 0;
        let todayCashPaymentAmount = 0;
        let yesterDayCardPaymentAmount = 0;
        let yesterDayCashPaymentAmount = 0;
        let todayCount = 0;
        let monthlyCount = 0;
        let processingCount = 0;

        const salesMap = new Map(buildLast7Days().map((entry) => [
          entry.date,
          { ...entry, total: 0, order: 0 },
        ]));
        const categoryMap = new Map();

        for (const order of orders) {
          const total = pickOrderAmount(order);
          totalOrderAmount += total;

          const createdTs = parseDate(pickOrderDate(order));
          const updatedDateIso = toISODate(pickOrderDate(order) || new Date());
          const salesRow = salesMap.get(updatedDateIso);
          if (salesRow) {
            salesRow.total += total;
            salesRow.order += 1;
          }

          if (createdTs !== null) {
            const createdAt = new Date(createdTs);
            if (createdAt >= monthStart) {
              monthlyOrderAmount += total;
              monthlyCount += 1;
            }
            if (createdAt >= todayStart && createdAt < tomorrowStart) {
              todayOrderAmount += total;
              todayCount += 1;
              const payment = pickPaymentMethod(order);
              if (payment.includes("cod") || payment.includes("cash")) {
                todayCashPaymentAmount += total;
              } else {
                todayCardPaymentAmount += total;
              }
            } else if (createdAt >= yesterdayStart && createdAt < todayStart) {
              yesterdayOrderAmount += total;
              const payment = pickPaymentMethod(order);
              if (payment.includes("cod") || payment.includes("cash")) {
                yesterDayCashPaymentAmount += total;
              } else {
                yesterDayCardPaymentAmount += total;
              }
            }
          }

          if (String(order?.status || "").toLowerCase() === "processing") {
            processingCount += 1;
          }

          const cartItems = Array.isArray(order?.cart) ? order.cart : [];
          cartItems.forEach((item) => {
            const name =
              String(
                item?.productType ||
                item?.category?.name ||
                item?.category ||
                item?.parent ||
                "Other"
              ).trim() || "Other";
            const qty = toAmount(item?.orderQuantity ?? item?.quantity ?? 1) || 1;
            categoryMap.set(name, (categoryMap.get(name) || 0) + qty);
          });
        }

        setAmounts({
          todayOrderAmount,
          yesterdayOrderAmount,
          monthlyOrderAmount,
          totalOrderAmount,
          todayCardPaymentAmount,
          todayCashPaymentAmount,
          yesterDayCardPaymentAmount,
          yesterDayCashPaymentAmount,
        });

        setOrderCounts({
          today: todayCount,
          monthly: monthlyCount,
          processing: processingCount,
        });

        setSalesReport(Array.from(salesMap.values()));

        const topCategories = Array.from(categoryMap.entries())
          .map(([name, count]) => ({ _id: name, count }))
          .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
          .slice(0, 5);
        setCategoryData(topCategories);

        setRecentOrders({
          orders: orders.slice(0, 8),
          totalOrder: orders.length,
        });
        setError("");
      } catch (err) {
        setError(err?.message || "Failed to load dashboard metrics");
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
    const number = new Intl.NumberFormat("en-PK", {
      maximumFractionDigits: 0,
    }).format(amount);
    return `Rs ${number}`;
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
    { label: "Dashboard", hint: "Overview", path: "/admin/dashboard", show: true },
    { label: "Staff Management", hint: "Roles", path: "/admin/staff", show: canAccessStaffManagement() },
    { label: "Customers", hint: "Accounts", path: "/admin/users", show: canViewCustomers() },
    { label: "Products", hint: "Catalog", path: "/admin/products", show: true },
    { label: "Clinical Products", hint: "Treatments", path: "/admin/clinical-products", show: true },
    { label: "Machines", hint: "Devices", path: "/admin/machines", show: true },
    { label: "Accessories", hint: "Clinic Gear", path: "/admin/accessories", show: true },
    { label: "Blog CMS", hint: "SEO Content", path: "/admin/blogs", show: true },
    { label: "Orders", hint: "Fulfillment", path: "/admin/orders", show: true },
    { label: "Contact Us", hint: "Leads", path: "/admin/contact-us", show: canAccessRestrictedSections() },
    { label: "Brands", hint: "Portfolio", path: "/admin/brands", show: true },
    { label: "Categories", hint: "Structure", path: "/admin/categories", show: canAccessRestrictedSections() },
    { label: "Coupons", hint: "Promotions", path: "/admin/coupons", show: canAccessRestrictedSections() },
    { label: "Image Manager", hint: "Assets", path: "/admin/cloudinary", show: true },
  ];
  const visibleNavItems = navItems.filter((item) => item.show);

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
      <a href="#dashboard-main" className="skip-link">Skip to dashboard content</a>
      <header className="aura-header">
        <div className="aura-header-inner">
          <div>
            <p className="aura-eyebrow">Admin Operations</p>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="aura-header-actions">
            <button
              type="button"
              className="nav-toggle-btn"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? "Close Menu" : "Menu"}
            </button>
            <div className="aura-admin-chip" aria-label="Current admin profile">
              <strong>{adminData?.name || "Admin"}</strong>
              <span>{adminData?.role || "Unknown role"}</span>
            </div>
            <button type="button" onClick={handleLogout} className="logout-btn" aria-label="Logout from admin dashboard">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main id="dashboard-main" className="aura-shell" role="main">
        <aside className={`aura-sidebar glass-panel${mobileNavOpen ? " mobile-open" : ""}`}>
          <p className="aura-kicker">Navigation</p>
          <nav className="aura-nav" aria-label="Admin sections">
            {visibleNavItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigateTo(item.path)}
                className={`aura-nav-item${location.pathname === item.path ? " active" : ""}`}
                aria-current={location.pathname === item.path ? "page" : undefined}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </nav>
        </aside>

        <section className="aura-content">
          {error && <div className="error-banner" role="alert" aria-live="polite">{error}</div>}

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
                <button type="button" onClick={() => navigateTo("/admin/orders")} className="action-btn primary">Review Orders</button>
                <button type="button" onClick={() => navigateTo("/admin/blogs/new")} className="action-btn">Add Blog</button>
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
                  <strong>{formatAmount(orderCounts.today)}</strong>
                </div>
                <div>
                  <span>Monthly Orders</span>
                  <strong>{formatAmount(orderCounts.monthly)}</strong>
                </div>
                <div>
                  <span>Processing Queue</span>
                  <strong>{orderCounts.processing}</strong>
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
              <table className="table" aria-label="Recent orders">
                <caption className="sr-only">Recent orders with invoice, date, payment method, customer, amount and status.</caption>
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
      {mobileNavOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />}

      <nav className="mobile-dock" aria-label="Quick navigation">
        <div className="mobile-dock-scroll">
          {visibleNavItems.map((item) => (
            <button
              key={`mobile-${item.path}`}
              type="button"
              onClick={() => navigateTo(item.path)}
              className={location.pathname === item.path ? "active" : ""}
              aria-current={location.pathname === item.path ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AdminDashboard;
