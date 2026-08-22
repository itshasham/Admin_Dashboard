import { useEffect, useMemo, useState } from "react";
import "./user.css";
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, Download, Info, RefreshCw, Users } from "lucide-react";
import { buildCustomerRows, pickArray } from "./customer-data";

const profileEndpoints = [
  "/admin/customers?page=1&limit=200",
  "/admin/users?page=1&limit=200",
];

const orderEndpoints = [
  "/order/admin/orders",
  "/order/orders",
  "/user-order/dashboard-recent-order",
];

const contactEndpoints = ["/contact-us?page=1&limit=200"];

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("adminData");
      const parsed = raw ? JSON.parse(raw) : null;
      setRole(String(parsed?.role || ""));
    } catch {
      setRole("");
    }
  }, []);

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const tryFetch = async (path, useAuth = true) => {
    const resp = await fetch(`${API_BASE_URL}${path}`, {
      headers: useAuth ? { ...getAuthHeaders() } : {},
      cache: "no-store",
    });
    const isJson = resp.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await resp.json().catch(() => null) : null;
    if (!resp.ok) throw new Error(data?.message || `Failed: ${path}`);
    return data;
  };

  const fetchFirstRows = async (endpoints, { useAuth = true } = {}) => {
    let succeeded = false;
    for (const endpoint of endpoints) {
      try {
        const data = await tryFetch(endpoint, useAuth);
        succeeded = true;
        const rows = pickArray(data);
        if (rows.length) return { rows, endpoint, succeeded: true };
      } catch (_error) {
        // Keep trying compatible deployments before falling back to local aggregation.
      }
    }
    return { rows: [], endpoint: "", succeeded };
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const profiles = await fetchFirstRows(profileEndpoints);
      if (profiles.rows.length) {
        setUsers(buildCustomerRows([{ source: "profiles", rows: profiles.rows }]));
        return;
      }

      const [orders, contacts] = await Promise.all([
        fetchFirstRows(orderEndpoints),
        fetchFirstRows(contactEndpoints),
      ]);
      const fallbackSources = [
        orders.rows.length ? { source: "orders", rows: orders.rows } : null,
        contacts.rows.length ? { source: "contacts", rows: contacts.rows } : null,
      ].filter(Boolean);
      const fallbackRows = buildCustomerRows(fallbackSources);

      setUsers(fallbackRows);
      setNotice(
        fallbackRows.length
          ? "Customer profiles are unavailable. Showing unique customers assembled from orders and contact submissions; repeated email addresses are merged into one row."
          : "Customer profiles are unavailable. No order or contact records were found to display."
      );

      if (!profiles.succeeded && !orders.succeeded && !contacts.succeeded) {
        throw new Error("Customer data sources are unavailable right now.");
      }
    } catch (err) {
      setUsers([]);
      setNotice("");
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role && role !== "CEO") return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => [
      user.name,
      user.email,
      user.phone,
      user.address,
      user.city,
      user.country,
      user.source,
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [query, users]);

  const stats = useMemo(() => ({
    uniqueCustomers: users.length,
    sourceRecords: users.reduce((total, user) => total + (user.recordCount || 0), 0),
    orders: users.reduce((total, user) => total + (user.totalOrders || 0), 0),
    subscribed: users.filter((user) => user.isSubscribedToMarketing === true).length,
  }), [users]);

  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString() : "-";
  };

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount)}`;
  };

  const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const exportCustomers = () => {
    if (!filteredUsers.length) return;
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "Country",
      "Total orders",
      "Total spent (PKR)",
      "Last order",
      "Marketing subscribed",
      "Records merged",
      "Source",
    ];
    const rows = filteredUsers.map((user) => [
      user.name || "",
      user.email || "",
      user.phone || "",
      user.address || "",
      user.city || "",
      user.country || "",
      user.totalOrders || 0,
      user.totalSpent || 0,
      formatDate(user.lastOrderDate),
      user.isSubscribedToMarketing === true ? "Yes" : "No",
      user.recordCount || 1,
      user.source || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nees-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (role && role !== "CEO") {
    return (
      <div className="page-container customers-page">
        <div className="page-header">
          <div>
            <p className="customers-eyebrow">Audience</p>
            <h2>Customers</h2>
          </div>
          <div className="actions">
            <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>
              <ArrowLeft size={15} aria-hidden="true" /> Back
            </button>
          </div>
        </div>
        <div className="error-panel" role="alert">Access denied: only the CEO can view customer details.</div>
      </div>
    );
  }

  return (
    <div className="page-container customers-page">
      <div className="page-header customers-header">
        <div>
          <p className="customers-eyebrow">Audience workspace</p>
          <h2>Customers</h2>
          <p className="customers-header-copy">One row per email address, with repeat records consolidated.</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>
            <ArrowLeft size={15} aria-hidden="true" /> Back
          </button>
          <button className="btn secondary" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" className={loading ? "customers-spin" : ""} />
            Refresh
          </button>
          <button className="btn" onClick={exportCustomers} disabled={loading || !filteredUsers.length}>
            <Download size={15} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>
      {notice && (
        <div className="customers-notice" role="status">
          <Info size={17} aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="error-panel customers-error" role="alert">
          <p className="error-panel-title">Customer data could not be loaded.</p>
          <p>{error}</p>
          <button className="btn secondary" type="button" onClick={fetchUsers}>Try again</button>
        </div>
      )}
      {!error && (
        <>
          <div className="customers-summary-grid">
            <div className="summary-card"><span className="summary-label">Unique customers</span><strong className="summary-value">{stats.uniqueCustomers}</strong><span className="summary-chip"><Users size={12} aria-hidden="true" /> Email deduped</span></div>
            <div className="summary-card"><span className="summary-label">Source records</span><strong className="summary-value">{stats.sourceRecords}</strong><span className="subtext">Raw records represented</span></div>
            <div className="summary-card"><span className="summary-label">Orders linked</span><strong className="summary-value">{stats.orders}</strong><span className="subtext">Across all customers</span></div>
            <div className="summary-card"><span className="summary-label">Marketing subscribed</span><strong className="summary-value">{stats.subscribed}</strong><span className="subtext">Known subscribers</span></div>
          </div>
          <div className="customers-toolbar">
            <label className="customers-search">
              <span className="sr-only">Search customers</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, phone, or city"
              />
            </label>
            <span className="customers-result-count">Showing {filteredUsers.length} of {users.length} customers</span>
          </div>
          {loading ? (
            <div className="customers-empty-state">Loading customer records...</div>
          ) : (
            <div className="table-responsive customers-table-wrap">
              <table className="table customers-table">
                <caption className="sr-only">Deduplicated customer records</caption>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                    <th>Subscribed</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="customer-name-cell">
                          <strong>{user.name || "Unknown customer"}</strong>
                          {user.recordCount > 1 && <span>{user.recordCount} records merged</span>}
                        </div>
                      </td>
                      <td>{user.email || "-"}</td>
                      <td>{user.phone || "-"}</td>
                      <td>{user.totalOrders || 0}</td>
                      <td>{formatMoney(user.totalSpent)}</td>
                      <td>{formatDate(user.lastOrderDate)}</td>
                      <td>{typeof user.isSubscribedToMarketing === "boolean" ? (user.isSubscribedToMarketing ? "Yes" : "No") : "-"}</td>
                      <td>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                  {!filteredUsers.length && (
                    <tr><td colSpan={8} className="customers-empty-state">{users.length ? "No customers match this search." : "No customer records found."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserList;
