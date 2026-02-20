import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./order.css";
import { API_BASE_URL } from "../../config/api";

const STATUS_OPTIONS = ["all", "pending", "processing", "dispatch", "cancel"];

const OrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
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
    if (Array.isArray(payload.orders)) return payload.orders;
    if (payload.data && Array.isArray(payload.data.orders)) return payload.data.orders;
    return [];
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/order/orders`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store"
      });

      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load orders");

      setOrders(pickArray(data));
    } catch (err) {
      setOrders([]);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const normalizeStatus = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "cancelled" || value === "canceled") return "cancel";
    if (value === "delivered" || value === "dispatched") return "dispatch";
    return value || "pending";
  };

  const statusLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === "dispatch") return "Dispatch";
    if (normalized === "processing") return "Processing";
    if (normalized === "cancel") return "Cancel";
    return "Pending";
  };

  const statusClass = (status) => {
    const value = normalizeStatus(status);
    if (value === "dispatch") return "status-badge status-success";
    if (value === "processing") return "status-badge status-info";
    if (value === "cancel") return "status-badge status-danger";
    if (value === "pending") return "status-badge status-warn";
    return "status-badge status-neutral";
  };

  const getOrderTimestamp = (order) => {
    const raw = order?.createdAt || order?.updatedAt;
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : 0;
  };

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter((order) => {
        const currentStatus = normalizeStatus(order?.status);
        if (statusFilter !== "all" && currentStatus !== statusFilter) return false;
        if (!needle) return true;

        const haystack = [
          order?.invoice,
          order?.name,
          order?.user?.name,
          order?.user?.email,
          order?.user,
          order?.email,
          order?.paymentMethod,
          order?.status
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(needle);
      })
      .sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    const counts = { pending: 0, processing: 0, dispatch: 0, cancel: 0 };
    let revenue = 0;

    orders.forEach((order) => {
      const currentStatus = normalizeStatus(order?.status);
      if (counts[currentStatus] !== undefined) counts[currentStatus] += 1;

      const amount = Number(order?.totalAmount);
      if (Number.isFinite(amount)) revenue += amount;
    });

    return { counts, revenue };
  }, [orders]);

  const visibleCounts = useMemo(
    () => ({
      all: orders.length,
      pending: stats.counts.pending,
      processing: stats.counts.processing,
      dispatch: stats.counts.dispatch,
      cancel: stats.counts.cancel
    }),
    [orders.length, stats.counts]
  );

  const formatAmount = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (value) => {
    try {
      return value ? new Date(value).toLocaleDateString() : "-";
    } catch {
      return "-";
    }
  };

  return (
    <div className="page-container orders-page">
      <div className="page-header fancy orders-header">
        <div className="orders-header-copy">
          <p className="orders-eyebrow">Operations</p>
          <h2>Orders</h2>
          <p className="muted">Track fulfillment, payment, and customer details in one place.</p>
        </div>
        <div className="actions orders-header-actions">
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/dashboard")}>
            ← Back
          </button>
          <button className="btn" type="button" onClick={fetchOrders} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="summary-grid orders-summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Orders</span>
          <span className="summary-value">{orders.length}</span>
          <span className="summary-chip">{filteredOrders.length} visible</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Revenue</span>
          <span className="summary-value">{formatAmount(stats.revenue)}</span>
          <span className="summary-chip">All time</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Pending</span>
          <span className="summary-value">{stats.counts.pending}</span>
          <span className="summary-chip">Needs action</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Dispatch</span>
          <span className="summary-value">{stats.counts.dispatch}</span>
          <span className="summary-chip">In transit</span>
        </div>
      </div>

      <div className="table-toolbar orders-toolbar">
        <div className="search-input orders-search-input">
          <input
            type="search"
            placeholder="Search by invoice, customer, email, or status"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="orders-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="orders-filter-wrap">
          <span className="orders-visible-note">
            Showing {filteredOrders.length} of {orders.length}
          </span>
          <div className="pill-row">
            {STATUS_OPTIONS.map((status) => (
              <button
                type="button"
                key={status}
                className={`filter-pill ${statusFilter === status ? "active" : ""}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
                <span className="pill-count">{visibleCounts[status]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card table-card orders-table-wrap">
        {error && (
          <div className="error-panel orders-error-panel">
            <p className="error-panel-title">{error}</p>
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="empty-state orders-empty-state">
            <p>No orders match your filters.</p>
            {(query || statusFilter !== "all") && (
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="empty-state orders-empty-state">
            <p>Loading orders...</p>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="table-responsive">
            <table className="table orders-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr key={order?._id || index}>
                    <td>
                      <span className="invoice-pill">{order?.invoice || "-"}</span>
                    </td>
                    <td>
                      <div className="order-customer-cell">
                        <strong>{order?.name || order?.user?.name || order?.user || "Unknown"}</strong>
                        <span>{order?.email || order?.user?.email || "No email"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="payment-text">{String(order?.paymentMethod || "-").toUpperCase()}</span>
                    </td>
                    <td>{formatDate(order?.createdAt || order?.updatedAt)}</td>
                    <td>
                      <span className="amount-pill">{formatAmount(order?.totalAmount)}</span>
                    </td>
                    <td>
                      <span className={statusClass(order?.status)}>{statusLabel(order?.status)}</span>
                    </td>
                    <td>
                      {order?._id ? (
                        <button
                          className="btn order-view-btn"
                          type="button"
                          onClick={() => navigate(`/admin/orders/${order._id}`)}
                        >
                          View
                        </button>
                      ) : (
                        <span className="subtext">No ID</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
