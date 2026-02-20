import React, { useEffect, useMemo, useState } from "react";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.result)) return payload.result;
  return [];
};

const fmtDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const ContactUsList = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchMessages = async ({ q = search, s = status } = {}) => {
    setLoading(true);
    setError("");

    try {
      const url = new URL(`${API_BASE_URL}/contact-us`);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "200");
      if (String(q || "").trim()) url.searchParams.set("q", String(q).trim());
      if (String(s || "").trim()) url.searchParams.set("status", String(s).trim());

      const resp = await fetch(url.toString(), {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to load contact messages");

      setMessages(pickArray(data));
    } catch (err) {
      setMessages([]);
      setError(err.message || "Failed to load contact messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const unreadCount = useMemo(
    () => messages.filter((entry) => String(entry?.status || "").toLowerCase() === "new").length,
    [messages]
  );

  const markAsRead = async (id) => {
    if (!id) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/contact-us/${id}/read`, {
        method: "PATCH",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to mark as read");
      await fetchMessages();
    } catch (err) {
      alert(err.message || "Failed to mark as read");
    }
  };

  const deleteMessage = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this contact message?")) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/contact-us/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchMessages();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Contact Us Messages</h2>
          <p className="muted">All submissions from website contact form.</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => fetchMessages()}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="actions" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Search name, email, subject"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ minWidth: 260 }}
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="btn secondary" onClick={() => fetchMessages({ q: search, s: status })}>Search</button>
          </div>
          <div className="muted">Unread: <strong>{unreadCount}</strong></div>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Subject</th>
              <th>Message</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((entry, idx) => {
              const id = entry?._id || entry?.id;
              const rowStatus = String(entry?.status || "new").toLowerCase();
              return (
                <tr key={id || idx}>
                  <td>{fmtDateTime(entry?.createdAt)}</td>
                  <td>{entry?.name || "-"}</td>
                  <td>{entry?.email || "-"}</td>
                  <td>{entry?.subject || "-"}</td>
                  <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{entry?.message || "-"}</td>
                  <td>
                    <span className="inline-badge" style={{ textTransform: "capitalize" }}>{rowStatus}</span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn"
                        disabled={!id || rowStatus !== "new"}
                        onClick={() => markAsRead(id)}
                      >
                        Mark Read
                      </button>
                      <button className="btn danger" disabled={!id} onClick={() => deleteMessage(id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!messages.length && (
              <tr>
                <td colSpan={7} className="muted">No contact messages found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ContactUsList;
