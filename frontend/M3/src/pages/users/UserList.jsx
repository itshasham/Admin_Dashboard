import React, { useEffect, useState } from "react";
import "./user.css";
import { API_BASE_URL } from '../../config/api';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

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

  const pickArray = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.users)) return payload.users;
    if (payload.data && Array.isArray(payload.data.users)) return payload.data.users;
    if (Array.isArray(payload.customers)) return payload.customers;
    if (payload.data && Array.isArray(payload.data.customers)) return payload.data.customers;
    return [];
  };

  const tryFetch = async (path) => {
    const resp = await fetch(`${API_BASE_URL}${path}`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
    const isJson = resp.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await resp.json().catch(() => null) : null;
    if (!resp.ok) throw new Error(data?.message || `Failed: ${path}`);
    return data;
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    const candidates = [
      "/admin/customers",
      "/admin/users",
    ];
    try {
      let got = null;
      for (const c of candidates) {
        try {
          const data = await tryFetch(c);
          const arr = pickArray(data);
          if (Array.isArray(arr) && arr.length >= 0) {
            got = arr;
            break;
          }
        } catch (_e) {
          // try next endpoint
        }
      }
      if (got == null) throw new Error("No customer endpoint responded");
      setUsers(got);
    } catch (err) {
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

  if (role && role !== "CEO") {
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>Customers</h2>
          <div className="actions">
            <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          </div>
        </div>
        <div className="error">Access denied: only the CEO can view customer details.</div>
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Customers</h2>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
        </div>
      </div>
      <table className="table">
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
          {users.map((u, idx) => (
            <tr key={u?._id || idx}>
              <td>{u?.name || "-"}</td>
              <td>{u?.email || "-"}</td>
              <td>{u?.phoneNumber || u?.phone || u?.contact || "-"}</td>
              <td>{u?.totalOrders ?? "-"}</td>
              <td>{u?.totalSpent ?? "-"}</td>
              <td>{u?.lastOrderDate ? new Date(u.lastOrderDate).toLocaleDateString() : "-"}</td>
              <td>{typeof u?.isSubscribedToMarketing === 'boolean' ? (u.isSubscribedToMarketing ? 'Yes' : 'No') : '-'}</td>
              <td>{u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : (u?.joiningDate ? new Date(u.joiningDate).toLocaleDateString() : "-")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
