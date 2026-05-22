import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const toDateLabel = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

const TrainingEventList = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] = useState("all");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE_URL}/training-events/admin/list`);
      url.searchParams.set("limit", "200");
      const resp = await fetch(url.toString(), {
        cache: "no-store",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to load training events");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      setEvents(pickArray(data));
    } catch (err) {
      setError(err?.message || "Failed to load training events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((entry) => {
      if (featuredFilter === "featured" && !entry?.featured) return false;
      if (featuredFilter === "not-featured" && entry?.featured) return false;
      if (registrationFilter === "open" && !entry?.registrationEnabled) return false;
      if (registrationFilter === "closed" && entry?.registrationEnabled) return false;
      if (!needle) return true;
      const hay = [
        entry?.title,
        entry?.category,
        entry?.venue,
        entry?.location,
        entry?.organizerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [events, query, featuredFilter, registrationFilter]);

  const applyEventPatch = (id, patch) => {
    setEvents((prev) =>
      prev.map((entry) => (String(entry?._id) === String(id) ? { ...entry, ...patch } : entry))
    );
  };

  const toggleFlag = async (id, type, currentValue) => {
    const path =
      type === "registration"
        ? `${API_BASE_URL}/training-events/admin/${id}/toggle-registration`
        : `${API_BASE_URL}/training-events/admin/${id}/toggle-featured`;
    const key = type === "registration" ? "registrationEnabled" : "featured";
    const next = !currentValue;
    applyEventPatch(id, { [key]: next });
    try {
      const resp = await fetch(path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ [key]: next }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to update event toggle");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      applyEventPatch(id, { [key]: Boolean(data?.data?.[key]) });
    } catch (err) {
      applyEventPatch(id, { [key]: currentValue });
      alert(err?.message || "Failed to update toggle");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this training event and all registrations?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/training-events/admin/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Delete failed");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      setEvents((prev) => prev.filter((entry) => String(entry?._id) !== String(id)));
    } catch (err) {
      alert(err?.message || "Delete failed");
    }
  };

  return (
    <div className="page-container products-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Training Events</p>
          <h2>Event Management</h2>
          <p className="muted">
            Create workshops/webinars, configure registration forms, and control featured visibility.
          </p>
        </div>
        <div className="header-side">
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/dashboard")}>
            ← Back
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => navigate("/admin/training-events/registrations")}
          >
            All Registrations
          </button>
          <button className="btn" type="button" onClick={() => navigate("/admin/training-events/new")}>
            + New Event
          </button>
        </div>
      </div>

      {error ? (
        <div className="error-panel">
          <p className="error-panel-title">{error}</p>
          <div className="actions">
            <button className="btn" type="button" onClick={fetchEvents}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <section className="card products-filter-bar">
        <div className="products-filter-controls">
          <label htmlFor="training-event-search">Search</label>
          <input
            id="training-event-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find by title, location, category"
          />
          <label htmlFor="training-event-featured-filter">Featured</label>
          <select
            id="training-event-featured-filter"
            value={featuredFilter}
            onChange={(event) => setFeaturedFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="featured">Featured only</option>
            <option value="not-featured">Not featured</option>
          </select>
          <label htmlFor="training-event-registration-filter">Registration</label>
          <select
            id="training-event-registration-filter"
            value={registrationFilter}
            onChange={(event) => setRegistrationFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <span className="muted">Showing {filteredEvents.length} of {events.length} events</span>
      </section>

      <section className="card products-table-wrap">
        {loading ? (
          <div className="products-empty"><p>Loading training events...</p></div>
        ) : filteredEvents.length === 0 ? (
          <div className="products-empty">
            <p>No events found.</p>
            <button className="btn" type="button" onClick={() => navigate("/admin/training-events/new")}>
              Create First Event
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table products-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date & Venue</th>
                  <th>Registration</th>
                  <th>Featured</th>
                  <th>Registrations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((entry) => {
                  const id = entry?._id;
                  const cover = Array.isArray(entry?.images) ? entry.images[0] : "";
                  return (
                    <tr key={id}>
                      <td>
                        <div className="product-cell">
                          {cover ? (
                            <img className="brand-thumb product-thumb" src={cover} alt={entry?.title || "event"} />
                          ) : (
                            <div className="product-thumb product-thumb-placeholder" aria-hidden="true">No Image</div>
                          )}
                          <div className="product-meta">
                            <strong>{entry?.title || "-"}</strong>
                            <span>{entry?.category || "Training Event"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{toDateLabel(entry?.eventDate)}</div>
                        <small className="muted">{entry?.venue || entry?.location || "-"}</small>
                      </td>
                      <td>
                        <label className="inline-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(entry?.registrationEnabled)}
                            onChange={() =>
                              toggleFlag(id, "registration", Boolean(entry?.registrationEnabled))
                            }
                          />
                          {entry?.registrationEnabled ? "Open" : "Closed"}
                        </label>
                      </td>
                      <td>
                        <label className="inline-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(entry?.featured)}
                            onChange={() => toggleFlag(id, "featured", Boolean(entry?.featured))}
                          />
                          {entry?.featured ? "Featured" : "Hidden"}
                        </label>
                      </td>
                      <td>
                        <strong>{Number(entry?.registrationCount || 0)}</strong>
                        <br />
                        <small className="muted">
                          {Number(entry?.remainingSeats) >= 0
                            ? `Remaining: ${entry.remainingSeats}`
                            : "Unlimited seats"}
                        </small>
                      </td>
                      <td>
                        <div className="actions product-row-actions">
                          <button className="btn" type="button" onClick={() => navigate(`/admin/training-events/${id}`)}>
                            Edit
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => navigate(`/admin/training-events/${id}/registrations`)}
                          >
                            Registrations
                          </button>
                          <button className="btn danger" type="button" onClick={() => handleDelete(id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default TrainingEventList;
