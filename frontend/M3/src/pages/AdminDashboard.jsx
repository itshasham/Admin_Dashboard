import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { API_BASE_URL } from '../config/api';

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
  const [salesReport, setSalesReport] = useState([]); // [{ date, total, order }]
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
    return ['Manager', 'CEO', 'Admin'].includes(adminData.role);
  };

  const canEditStaff = () => {
    if (!adminData) return false;
    return ['Manager', 'CEO'].includes(adminData.role);
  };

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
        if (sResp.ok && Array.isArray(sJson?.salesReport)) setSalesReport(sJson.salesReport);

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
    if (value === "delivered") return "success";
    if (value === "processing") return "info";
    if (value === "cancel" || value === "cancelled") return "danger";
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
            <button onClick={() => navigateTo('/admin/users')} className="nav-item">Users</button>
            <button onClick={() => navigateTo('/admin/products')} className="nav-item">Products</button>
            <button onClick={() => navigateTo('/admin/orders')} className="nav-item">Orders</button>
            <button onClick={() => navigateTo('/admin/brands')} className="nav-item">Brands</button>
            <button onClick={() => navigateTo('/admin/categories')} className="nav-item">Categories</button>
            <button onClick={() => navigateTo('/admin/coupons')} className="nav-item">Coupons</button>
            <button onClick={() => navigateTo('/admin/cloudinary')} className="nav-item">Cloudinary</button>
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
              <div className="bar-chart">
                {salesReport.map((s, idx) => (
                  <div key={idx} className="bar-item" title={`${s.date}: ${s.total}`}>
                    <div className="bar" style={{ height: `${(Number(s.total) || 0) / maxSales * 100}%` }} />
                    <span className="bar-label">{String(s.date).slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card chart-card">
              <div className="card-header"><h2>Top Categories</h2></div>
              <div className="bar-chart">
                {categoryData.map((c, idx) => (
                  <div key={idx} className="bar-item" title={`${c._id}: ${c.count}`}>
                    <div className="bar bar-secondary" style={{ height: `${(Number(c.count) || 0) / maxCat * 100}%` }} />
                    <span className="bar-label">{String(c._id).slice(0, 8)}</span>
                  </div>
                ))}
              </div>
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
