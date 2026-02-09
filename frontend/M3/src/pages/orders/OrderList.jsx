import React, { useEffect, useMemo, useState } from "react";
import "./order.css";
import { API_BASE_URL } from '../../config/api';

const OrderList = () => {
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
      console.log("Fetching orders from:", `${API_BASE_URL}/order/orders`);
      const resp = await fetch(`${API_BASE_URL}/order/orders`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      
      console.log("Orders API Response Status:", resp.status, resp.statusText);
      
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      
      console.log("Orders API Response Data:", data);
      
      if (!resp.ok) throw new Error(data?.message || "Failed to load orders");
      
      const ordersArray = pickArray(data);
      console.log("Processed Orders Array:", ordersArray);
      console.log("Order IDs:", ordersArray.map(o => ({ id: o?._id, invoice: o?.invoice, hasId: !!o?._id })));
      
      setOrders(ordersArray);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const normalizeStatus = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "cancelled" || value === "canceled") return "cancel";
    return value;
  };

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusValue = normalizeStatus(order?.status);
      if (statusFilter !== "all" && statusValue !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [
        order?.invoice,
        order?.name,
        order?.user,
        order?.email,
        order?.paymentMethod,
        order?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    const counts = { pending: 0, processing: 0, delivered: 0, cancel: 0 };
    let revenue = 0;
    orders.forEach((order) => {
      const statusValue = normalizeStatus(order?.status);
      if (counts[statusValue] !== undefined) counts[statusValue] += 1;
      const amount = Number(order?.totalAmount);
      if (!Number.isNaN(amount)) revenue += amount;
    });
    return { counts, revenue };
  }, [orders]);

  const formatAmount = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (value) => {
    try { return value ? new Date(value).toLocaleDateString() : "-"; } catch { return "-"; }
  };

  const statusClass = (status) => {
    const value = normalizeStatus(status);
    if (value === "delivered") return "status-badge status-success";
    if (value === "processing") return "status-badge status-info";
    if (value === "cancel") return "status-badge status-danger";
    if (value === "pending") return "status-badge status-warn";
    return "status-badge status-neutral";
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>Orders</h2>
          <p className="muted">Track fulfillment, payment, and customer details in one place</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={fetchOrders}>Refresh</button>
        </div>
      </div>

      <div className="summary-grid">
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
          <span className="summary-label">Delivered</span>
          <span className="summary-value">{stats.counts.delivered}</span>
          <span className="summary-chip">Completed</span>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-input">
          <input
            type="search"
            placeholder="Search by invoice, customer, email, or status"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="pill-row">
          {["all", "pending", "processing", "delivered", "cancel"].map((status) => (
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
              {filteredOrders.map((o, idx) => (
                <tr key={o?._id || idx}>
                  <td>{o?.invoice || "-"}</td>
                  <td>{o?.name || o?.user || o?.email || "-"}</td>
                  <td>{o?.paymentMethod || "-"}</td>
                  <td>{formatDate(o?.createdAt)}</td>
                  <td>{formatAmount(o?.totalAmount)}</td>
                  <td><span className={statusClass(o?.status)}>{o?.status || "pending"}</span></td>
                  <td>
                    <div className="actions">
                      {o?._id ? (
                        <button className="btn" onClick={() => (window.location.href = `/admin/orders/${o._id}`)}>View</button>
                      ) : (
                        <span className="subtext">No ID</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredOrders.length && (
          <div className="empty-state">
            <p>No orders match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
