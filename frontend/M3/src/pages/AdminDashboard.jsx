/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpenText,
  Boxes,
  BriefcaseMedical,
  ChevronRight,
  CircleDollarSign,
  ContactRound,
  CreditCard,
  Gauge,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Tags,
  TicketPercent,
  TrendingDown,
  TrendingUp,
  UserRoundCog,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
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

const getOrderAmount = (order) => {
  const directAmount = toAmount(
    order?.totalAmount ??
    order?.total ??
    order?.totalPrice ??
    order?.amount ??
    order?.grandTotal
  );
  if (directAmount > 0) return directAmount;

  const fallbackAmount =
    toAmount(order?.subTotal) +
    toAmount(order?.shippingCost) +
    toAmount(order?.paymentFee) -
    toAmount(order?.discount);
  return fallbackAmount > 0 ? fallbackAmount : 0;
};

const EmptyChart = ({ icon: Icon, title, description }) => (
  <div className="chart-empty" role="status" aria-live="polite">
    <span className="empty-icon" aria-hidden="true"><Icon size={21} /></span>
    <strong>{title}</strong>
    <p>{description}</p>
  </div>
);

const SalesChart = ({ data }) => {
  const W = 560;
  const H = 240;
  const M = { l: 54, r: 14, t: 16, b: 46 };
  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;

  const max = Math.max(...data.map((d) => Number(d.total) || 0), 0);
  const hasData = max > 0;

  if (!hasData) {
    return (
      <EmptyChart
        icon={BarChart3}
        title="No sales activity yet"
        description="Revenue will appear here as soon as an order is recorded."
      />
    );
  }

  const ticks = buildTicks(max, 4);
  const top = ticks[ticks.length - 1] || 1;
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="sales-chart-svg"
      role="img"
      aria-label="Revenue over the last seven days"
    >
      <defs>
        <linearGradient id="salesAuraFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(14, 116, 101, 0.3)" />
          <stop offset="1" stopColor="rgba(14, 116, 101, 0.01)" />
        </linearGradient>
      </defs>

      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="rgba(31, 45, 43, 0.1)" strokeWidth="1" />
            <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#65736f">
              {formatCompact(t)}
            </text>
          </g>
        );
      })}

      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="rgba(31, 45, 43, 0.22)" strokeWidth="1" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="rgba(31, 45, 43, 0.22)" strokeWidth="1" />

      <path d={areaD} fill="url(#salesAuraFill)" />
      <path d={lineD} fill="none" stroke="#0e7465" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={d.date} cx={xFor(i)} cy={yFor(d.total)} r="4" fill="#0e7465" stroke="#f7faf8" strokeWidth="2">
          <title>{`${d.label}: ${Number(d.total) || 0}`}</title>
        </circle>
      ))}

      {data.map((d, i) => (
        <text key={d.date} x={xFor(i)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#65736f">
          {d.label}
        </text>
      ))}
    </svg>
  );
};

const CategoryChart = ({ data }) => {
  const max = Math.max(...data.map((d) => Number(d.count) || 0), 0);

  if (!data.length || max <= 0) {
    return (
      <EmptyChart
        icon={Boxes}
        title="No category demand yet"
        description="Top-selling product categories will be ranked here."
      />
    );
  }

  return (
    <div className="category-ranking" aria-label="Top selling categories">
      {data.map((category, index) => {
        const count = Number(category.count) || 0;
        const label = String(category._id || "Other");
        return (
          <div className="category-rank-row" key={`${label}-${index}`}>
            <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="rank-copy">
              <div>
                <strong>{label}</strong>
                <span>{formatCompact(count)} items</span>
              </div>
              <span className="rank-track" aria-hidden="true">
                <span style={{ width: `${Math.max(8, (count / max) * 100)}%` }} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PaymentMixCard = ({ title, cardAmount, cashAmount, formatCurrency, periodLabel }) => {
  const total = Number(cardAmount || 0) + Number(cashAmount || 0);
  const cardPercent = total > 0 ? Math.round((Number(cardAmount || 0) / total) * 100) : 0;
  const cashPercent = total > 0 ? 100 - cardPercent : 0;

  return (
    <article className="data-card payment-card">
      <div className="card-heading-row">
        <div>
          <span className="section-label">{periodLabel}</span>
          <h2>{title}</h2>
        </div>
        <span className="card-total">{formatCurrency(total)}</span>
      </div>

      {total > 0 ? (
        <div className="payment-content">
          <div className="payment-meter" aria-label={`${cardPercent}% card and ${cashPercent}% cash`}>
            <span className="payment-meter-card" style={{ width: `${cardPercent}%` }} />
            <span className="payment-meter-cash" style={{ width: `${cashPercent}%` }} />
          </div>
          <div className="payment-legend">
            <div>
              <span className="legend-dot card-dot" aria-hidden="true" />
              <span>Card</span>
              <strong>{cardPercent}%</strong>
            </div>
            <div>
              <span className="legend-dot cash-dot" aria-hidden="true" />
              <span>Cash</span>
              <strong>{cashPercent}%</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="compact-empty" role="status" aria-live="polite">
          <CreditCard size={18} aria-hidden="true" />
          <span>No recorded payments for this period.</span>
        </div>
      )}
    </article>
  );
};

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const mobileMenuButtonRef = useRef(null);
  const mobileSidebarRef = useRef(null);
  const firstMobileNavRef = useRef(null);

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
    if (!mobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstMobileNavRef.current?.focus(), 0);

    const handleDrawerKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        mobileMenuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !mobileSidebarRef.current) return;
      const focusable = Array.from(
        mobileSidebarRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDrawerKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const fetchDashboard = async () => {
      setDataLoading(true);
      try {
        const pickOrders = (payload) => {
          const visited = new Set();
          const queue = [payload];

          while (queue.length) {
            const current = queue.shift();
            if (!current || typeof current !== "object") continue;
            if (visited.has(current)) continue;
            visited.add(current);

            if (Array.isArray(current)) return current;

            if (Array.isArray(current?.data)) return current.data;
            if (Array.isArray(current?.orders)) return current.orders;
            if (Array.isArray(current?.order)) return current.order;
            if (Array.isArray(current?.results)) return current.results;
            if (Array.isArray(current?.orderItems)) return current.orderItems;

            Object.values(current).forEach((value) => {
              if (value && typeof value === "object") queue.push(value);
            });
          }

          return [];
        };
        const parseDate = (value) => {
          const parsed = Date.parse(value);
          return Number.isFinite(parsed) ? parsed : null;
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
        const endpointGroups = [
          {
            name: "admin",
            useAuth: true,
            endpoints: [
              `${API_BASE_URL}/order/admin/orders`,
              `${API_BASE_URL}/order/orders`,
            ],
          },
          {
            name: "fallback",
            useAuth: false,
            endpoints: [
              `${API_BASE_URL}/user-order/dashboard-recent-order`,
            ],
          },
        ];
        let orders = [];
        let loaded = false;
        let lastError = "Failed to load orders";
        let authFailureMessage = "";
        let anySuccess = false;
        const attempts = [];

        for (const group of endpointGroups) {
          for (const endpoint of group.endpoints) {
            const ordersResp = await fetch(endpoint, {
              headers: group.useAuth ? { ...getAuthHeaders() } : {},
              cache: "no-store",
            });
            const ordersJson = (ordersResp.headers.get("content-type") || "").includes("application/json")
              ? await ordersResp.json().catch(() => null)
              : null;

            if (ordersResp.ok) {
              anySuccess = true;
              const candidateOrders = pickOrders(ordersJson).sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
              if (candidateOrders.length > 0) {
                orders = candidateOrders;
                loaded = true;
                break;
              }
              attempts.push({
                endpoint,
                status: ordersResp.status,
                message: "Request succeeded but returned 0 orders",
              });
              continue;
            }

            if (group.useAuth && ordersResp.status === 401 && !authFailureMessage) {
              authFailureMessage = "Your admin session expired. Please login again.";
            }
            if (group.useAuth && ordersResp.status === 403 && !authFailureMessage) {
              authFailureMessage = "You are not authorized to access order metrics.";
            }

            lastError = ordersJson?.message || "Failed to load orders";
            attempts.push({
              endpoint,
              status: ordersResp.status,
              message: ordersJson?.message || ordersJson?.error || "Request failed",
            });
          }
          if (loaded) break;
        }

        if (!loaded) {
          if (authFailureMessage) {
            throw new Error(authFailureMessage);
          }
          if (!anySuccess) {
            throw new Error(authFailureMessage || lastError);
          }
          orders = [];
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
          const total = getOrderAmount(order);
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
        setLastUpdated(new Date());
      } catch (err) {
        setError(err?.message || "Failed to load dashboard metrics");
      } finally {
        setDataLoading(false);
      }
    };
    fetchDashboard();
  }, [refreshToken]);

  const formatAmount = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return "0";
    return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
  };

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `Rs ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount)}`;
  };

  const formatSignedCurrency = (value) => {
    const amount = Number(value) || 0;
    if (amount === 0) return formatCurrency(0);
    return `${amount > 0 ? "+" : "−"}${formatCurrency(Math.abs(amount))}`;
  };

  const statusTone = (status = "") => {
    const value = String(status).toLowerCase();
    if (["dispatch", "delivered", "dispatched"].includes(value)) return "success";
    if (value === "processing") return "info";
    if (["cancel", "cancelled", "canceled"].includes(value)) return "danger";
    return "warn";
  };

  const fmtDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  };

  const navGroups = [
    {
      label: "Operations",
      items: [
        { label: "Overview", hint: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard, show: true },
        { label: "Orders", hint: "Fulfillment", path: "/admin/orders", icon: ShoppingBag, show: true },
        { label: "Customer leads", hint: "Contact inbox", path: "/admin/contact-us", icon: ContactRound, show: canAccessRestrictedSections() },
      ],
    },
    {
      label: "Catalog",
      items: [
        { label: "Retail products", hint: "Store catalog", path: "/admin/products", icon: Package, show: true },
        { label: "Clinical products", hint: "Treatments", path: "/admin/clinical-products", icon: Stethoscope, show: true },
        { label: "Machines", hint: "Devices", path: "/admin/machines", icon: Wrench, show: true },
        { label: "Accessories", hint: "Clinic gear", path: "/admin/accessories", icon: BriefcaseMedical, show: true },
        { label: "Brands", hint: "Portfolio", path: "/admin/brands", icon: Sparkles, show: true },
        { label: "Categories", hint: "Structure", path: "/admin/categories", icon: Tags, show: canAccessRestrictedSections() },
      ],
    },
    {
      label: "Growth",
      items: [
        { label: "Blog CMS", hint: "SEO content", path: "/admin/blogs", icon: BookOpenText, show: true },
        { label: "Training events", hint: "Workshops", path: "/admin/training-events", icon: Activity, show: true },
        { label: "Coupons", hint: "Promotions", path: "/admin/coupons", icon: TicketPercent, show: canAccessRestrictedSections() },
        { label: "Map links", hint: "Location pins", path: "/admin/google-map-links", icon: MapPinned, show: canAccessRestrictedSections() },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "Staff", hint: "Roles & access", path: "/admin/staff", icon: UserRoundCog, show: canAccessStaffManagement() },
        { label: "Customers", hint: "Accounts", path: "/admin/users", icon: Users, show: canViewCustomers() },
        { label: "Image manager", hint: "Cloud assets", path: "/admin/cloudinary", icon: ImageIcon, show: true },
      ],
    },
  ];

  const visibleNavGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.show) }))
    .filter((group) => group.items.length > 0);

  const orderDelta = Number(amounts.todayOrderAmount || 0) - Number(amounts.yesterdayOrderAmount || 0);
  const orderDeltaPercent = Number(amounts.yesterdayOrderAmount || 0) > 0
    ? Math.abs((orderDelta / Number(amounts.yesterdayOrderAmount || 1)) * 100).toFixed(1)
    : null;
  const hasRevenueBaseline = Number(amounts.todayOrderAmount || 0) > 0 || Number(amounts.yesterdayOrderAmount || 0) > 0;
  const trendTone = !hasRevenueBaseline ? "neutral" : orderDelta > 0 ? "positive" : orderDelta < 0 ? "negative" : "neutral";
  const TrendIcon = trendTone === "positive" ? TrendingUp : trendTone === "negative" ? TrendingDown : Activity;
  const trendTitle = !hasRevenueBaseline
    ? "Ready for today’s activity"
    : orderDelta > 0
      ? "Revenue is ahead of yesterday"
      : orderDelta < 0
        ? "Revenue is tracking below yesterday"
        : "Revenue is holding steady";
  const trendDescription = !hasRevenueBaseline
    ? "New orders and payment activity will update this view automatically."
    : orderDeltaPercent === null
      ? "There is no comparable revenue baseline from yesterday."
      : `${orderDeltaPercent}% ${orderDelta >= 0 ? "increase" : "decrease"} compared with yesterday.`;
  const adminName = adminData?.name || "Admin";
  const firstName = adminName.trim().split(/\s+/)[0] || "Admin";
  const initials = adminName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
  const todayLabel = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "Waiting for data";
  const averageTicket = recentOrders.totalOrder
    ? amounts.totalOrderAmount / recentOrders.totalOrder
    : 0;

  const metricCards = [
    {
      label: "Today revenue",
      value: formatCurrency(amounts.todayOrderAmount),
      helper: `${formatAmount(orderCounts.today)} order${orderCounts.today === 1 ? "" : "s"} today`,
      icon: CircleDollarSign,
      tone: "emerald",
    },
    {
      label: "Yesterday revenue",
      value: formatCurrency(amounts.yesterdayOrderAmount),
      helper: hasRevenueBaseline ? "Comparison baseline" : "No activity recorded",
      icon: WalletCards,
      tone: "slate",
    },
    {
      label: "Monthly revenue",
      value: formatCurrency(amounts.monthlyOrderAmount),
      helper: `${formatAmount(orderCounts.monthly)} orders this month`,
      icon: BarChart3,
      tone: "blue",
    },
    {
      label: "Lifetime revenue",
      value: formatCurrency(amounts.totalOrderAmount),
      helper: `${formatAmount(recentOrders.totalOrder)} orders tracked`,
      icon: Sparkles,
      tone: "amber",
    },
  ];

  const renderOrderStatus = (status) => (
    <span className={`status-pill status-${statusTone(status)}`}>{status || "Pending"}</span>
  );

  if (loading) {
    return (
      <div className="admin-dashboard loading-view">
        <div className="loading-shell" role="status" aria-live="polite">
          <img src="/brand-logo-favicon.png" alt="NEES Medical logo" />
          <div className="loading-dot" aria-hidden="true" />
          <p>Opening NEES command center…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <a href="#main" className="skip-link">Skip to main content</a>

      <div className={`console-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside
          ref={mobileSidebarRef}
          id="admin-primary-navigation"
          className={`console-sidebar${mobileNavOpen ? " mobile-open" : ""}`}
          aria-label="Admin navigation"
        >
          <div className="sidebar-brand-row">
            <button
              type="button"
              className="sidebar-brand"
              onClick={() => navigateTo("/admin/dashboard")}
              aria-label="Go to admin overview"
            >
              <span className="brand-mark"><img src="/brand-logo-favicon.png" alt="NEES Medical logo" /></span>
              <span className="brand-copy">
                <strong>NEES Medical</strong>
                <small>Operations console</small>
              </span>
            </button>
            <button
              type="button"
              className="mobile-drawer-close"
              onClick={() => {
                setMobileNavOpen(false);
                mobileMenuButtonRef.current?.focus();
              }}
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Admin sections">
            {visibleNavGroups.map((group) => (
              <div className="nav-group" key={group.label}>
                <p>{group.label}</p>
                <div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                      <button
                        ref={item.path === "/admin/dashboard" ? firstMobileNavRef : undefined}
                        key={item.path}
                        type="button"
                        onClick={() => navigateTo(item.path)}
                        className={`sidebar-nav-item${active ? " active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                        <span className="nav-copy">
                          <strong>{item.label}</strong>
                          <small>{item.hint}</small>
                        </span>
                        {active && <span className="active-indicator" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-profile">
              <span className="profile-avatar" aria-hidden="true">{initials}</span>
              <span className="profile-copy">
                <strong>{adminName}</strong>
                <small>{adminData?.role || "Administrator"}</small>
              </span>
            </div>
            <button
              type="button"
              className="sidebar-collapse-button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={sidebarCollapsed}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </aside>

        <div className="console-workspace">
          <header className="console-topbar">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-controls="admin-primary-navigation"
              aria-expanded={mobileNavOpen}
            >
              <Menu size={21} />
            </button>

            <div className="topbar-breadcrumb" aria-label="Breadcrumb">
              <span>Admin</span>
              <ChevronRight size={14} aria-hidden="true" />
              <strong>Overview</strong>
            </div>

            <div className="topbar-actions">
              <span className="sync-status" aria-live="polite">
                <span className={`sync-dot${dataLoading ? " syncing" : ""}`} aria-hidden="true" />
                {dataLoading ? "Syncing" : `Updated ${lastUpdatedLabel}`}
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setRefreshToken((token) => token + 1)}
                disabled={dataLoading}
                aria-label="Refresh dashboard data"
              >
                <RefreshCw size={18} className={dataLoading ? "spin" : ""} />
              </button>
              <div className="topbar-profile" aria-label={`Signed in as ${adminName}, ${adminData?.role || "Administrator"}`}>
                <span className="profile-avatar" aria-hidden="true">{initials}</span>
                <span>
                  <strong>{adminName}</strong>
                  <small>{adminData?.role || "Administrator"}</small>
                </span>
              </div>
              <button type="button" className="icon-button logout-icon" onClick={handleLogout} aria-label="Log out">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <main id="main" className="dashboard-main" aria-busy={dataLoading}>
            <section className="page-intro" aria-labelledby="dashboard-title">
              <div>
                <p className="page-eyebrow"><ShieldCheck size={15} aria-hidden="true" /> Command center</p>
                <h1 id="dashboard-title">Good day, {firstName}.</h1>
                <p>{todayLabel} · Here is what needs attention across NEES Medical.</p>
              </div>
              <div className="page-actions">
                <button type="button" className="button secondary" onClick={() => navigateTo("/admin/products/new")}>
                  <Package size={17} /> Add product
                </button>
                <button type="button" className="button primary" onClick={() => navigateTo("/admin/orders")}>
                  Review orders <ChevronRight size={17} />
                </button>
              </div>
            </section>

            {error && (
              <div className="error-banner" role="alert" aria-live="assertive">
                <div>
                  <strong>Dashboard data could not be refreshed.</strong>
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setRefreshToken((token) => token + 1)}>Try again</button>
              </div>
            )}

            <section className="metric-grid" aria-label="Revenue summary">
              {metricCards.map((metric) => {
                const Icon = metric.icon;
                return (
                  <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
                    <div className="metric-card-top">
                      <span className="metric-icon" aria-hidden="true"><Icon size={20} /></span>
                      <span className="metric-label">{metric.label}</span>
                    </div>
                    <strong>{metric.value}</strong>
                    <p>{metric.helper}</p>
                  </article>
                );
              })}
            </section>

            <section className="overview-grid" aria-label="Daily operations overview">
              <article className={`trend-panel trend-${trendTone}`}>
                <div className="trend-panel-icon" aria-hidden="true"><TrendIcon size={25} /></div>
                <div className="trend-panel-copy">
                  <span className="section-label">Today vs yesterday</span>
                  <h2>{trendTitle}</h2>
                  <p>{trendDescription}</p>
                </div>
                <div className="trend-panel-value">
                  <strong>{formatSignedCurrency(orderDelta)}</strong>
                  <span>Revenue difference</span>
                </div>
              </article>

              <article className="data-card order-health-card">
                <div className="card-heading-row">
                  <div>
                    <span className="section-label">Fulfillment</span>
                    <h2>Order health</h2>
                  </div>
                  <span className={`queue-badge${orderCounts.processing > 0 ? " has-work" : ""}`}>
                    {formatAmount(orderCounts.processing)} processing
                  </span>
                </div>
                <div className="order-health-grid">
                  <div><span>Average ticket</span><strong>{formatCurrency(averageTicket)}</strong></div>
                  <div><span>Today’s orders</span><strong>{formatAmount(orderCounts.today)}</strong></div>
                  <div><span>Monthly orders</span><strong>{formatAmount(orderCounts.monthly)}</strong></div>
                  <div><span>Orders tracked</span><strong>{formatAmount(recentOrders.totalOrder)}</strong></div>
                </div>
              </article>
            </section>

            <section className="payment-grid" aria-label="Payment overview">
              <PaymentMixCard
                title="Today’s payment mix"
                periodLabel="Current day"
                cardAmount={amounts.todayCardPaymentAmount}
                cashAmount={amounts.todayCashPaymentAmount}
                formatCurrency={formatCurrency}
              />
              <PaymentMixCard
                title="Yesterday’s payment mix"
                periodLabel="Previous day"
                cardAmount={amounts.yesterDayCardPaymentAmount}
                cashAmount={amounts.yesterDayCashPaymentAmount}
                formatCurrency={formatCurrency}
              />
            </section>

            <section className="analytics-grid" aria-label="Sales analytics">
              <article className="data-card chart-card">
                <div className="card-heading-row">
                  <div>
                    <span className="section-label">Revenue signal</span>
                    <h2>Last 7 days</h2>
                  </div>
                  <span className="meta-badge"><BarChart3 size={14} /> Daily trend</span>
                </div>
                <SalesChart data={salesReport} />
              </article>

              <article className="data-card chart-card">
                <div className="card-heading-row">
                  <div>
                    <span className="section-label">Demand signal</span>
                    <h2>Top categories</h2>
                  </div>
                  <span className="meta-badge"><Gauge size={14} /> Ranked</span>
                </div>
                <CategoryChart data={categoryData} />
              </article>
            </section>

            <section className="data-card orders-card" aria-labelledby="recent-orders-title">
              <div className="card-heading-row orders-heading">
                <div>
                  <span className="section-label">Latest activity</span>
                  <h2 id="recent-orders-title">Recent orders</h2>
                </div>
                <button type="button" className="text-button" onClick={() => navigateTo("/admin/orders")}>
                  View all orders <ChevronRight size={16} />
                </button>
              </div>

              {recentOrders.orders.length > 0 ? (
                <>
                  <div className="orders-desktop table-responsive">
                    <table className="orders-table">
                      <caption className="sr-only">Recent orders with invoice, date, payment method, customer, amount, and status.</caption>
                      <thead>
                        <tr>
                          <th scope="col">Invoice</th>
                          <th scope="col">Customer</th>
                          <th scope="col">Date</th>
                          <th scope="col">Payment</th>
                          <th scope="col">Total</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.orders.map((order, index) => {
                          const customer = order.name || order.user?.name || order.user?.email || "Guest customer";
                          const invoice = order.invoice || order.orderId || `#${String(order._id || index).slice(-8)}`;
                          return (
                            <tr key={order._id || order.invoice || index}>
                              <td><strong>{invoice}</strong></td>
                              <td>{customer}</td>
                              <td>{fmtDate(order.createdAt || order.updatedAt)}</td>
                              <td>{order.paymentMethod || order.payment?.method || "—"}</td>
                              <td><strong>{formatCurrency(getOrderAmount(order))}</strong></td>
                              <td>{renderOrderStatus(order.status)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="orders-mobile" aria-label="Recent order cards">
                    {recentOrders.orders.map((order, index) => {
                      const customer = order.name || order.user?.name || order.user?.email || "Guest customer";
                      const invoice = order.invoice || order.orderId || `#${String(order._id || index).slice(-8)}`;
                      return (
                        <article className="mobile-order-card" key={`mobile-${order._id || order.invoice || index}`}>
                          <div className="mobile-order-head">
                            <div>
                              <span>{invoice}</span>
                              <strong>{customer}</strong>
                            </div>
                            {renderOrderStatus(order.status)}
                          </div>
                          <dl>
                            <div><dt>Total</dt><dd>{formatCurrency(getOrderAmount(order))}</dd></div>
                            <div><dt>Payment</dt><dd>{order.paymentMethod || order.payment?.method || "—"}</dd></div>
                            <div><dt>Date</dt><dd>{fmtDate(order.createdAt || order.updatedAt)}</dd></div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="orders-empty" role="status" aria-live="polite">
                  <ShoppingBag size={24} aria-hidden="true" />
                  <div>
                    <strong>No recent orders</strong>
                    <p>New orders will appear here with payment and fulfillment details.</p>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={() => {
            setMobileNavOpen(false);
            mobileMenuButtonRef.current?.focus();
          }}
        />
      )}

      <nav className="mobile-dock" aria-label="Mobile quick navigation">
        <button type="button" className="active" onClick={() => navigateTo("/admin/dashboard")} aria-current="page">
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>
        <button type="button" onClick={() => navigateTo("/admin/orders")}>
          <ShoppingBag size={20} />
          <span>Orders</span>
        </button>
        <button type="button" onClick={() => navigateTo("/admin/products")}>
          <Package size={20} />
          <span>Products</span>
        </button>
        <button type="button" onClick={() => setMobileNavOpen(true)} aria-expanded={mobileNavOpen} aria-controls="admin-primary-navigation">
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminDashboard;
