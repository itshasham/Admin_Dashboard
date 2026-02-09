import React, { useEffect, useState } from "react";
import "./user.css";

const API_BASE_URL = " http://localhost:7001/api";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      "/user/all",
      "/users",
      "/customer/all",
      "/customers",
      "/user",
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

  useEffect(() => { fetchUsers(); }, []);

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
            <th>Avatar</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Phone</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u?._id || idx}>
              <td>
                {u?.image ? (
                  <img className="brand-thumb" src={u.image} alt={u?.name || "user"} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                )}
              </td>
              <td>{u?.name || "-"}</td>
              <td>{u?.email || "-"}</td>
              <td>{u?.role || "user"}</td>
              <td>{u?.status || "active"}</td>
              <td>{u?.phone || u?.contact || "-"}</td>
              <td>{u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : (u?.joiningDate ? new Date(u.joiningDate).toLocaleDateString() : "-")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
