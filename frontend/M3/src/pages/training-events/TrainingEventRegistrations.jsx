import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const statusOptions = ["under_review", "approved", "rejected", "attended"];
const exportFormats = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
  { value: "pdf", label: "PDF (.pdf)" },
];
const exportColumnOptions = [
  { key: "registration_number", label: "Registration Number" },
  { key: "doctor_name", label: "Doctor Name" },
  { key: "pmdc_number", label: "PMDC Number" },
  { key: "phone_number", label: "Phone Number" },
  { key: "email_address", label: "Email Address" },
  { key: "clinic_name", label: "Clinic/Hospital Name" },
  { key: "specialization", label: "Specialization" },
  { key: "city", label: "City" },
  { key: "event_city", label: "Event City" },
  { key: "event_location", label: "Event Location" },
  { key: "event_name", label: "Event Name" },
  { key: "registration_status", label: "Registration Status" },
  { key: "registration_date", label: "Registration Date" },
  { key: "approved_date", label: "Approved Date" },
  { key: "approved_by", label: "Approved By" },
  { key: "notes_comments", label: "Notes/Comments" },
];

const normalizeStatusValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending") return "under_review";
  return normalized || "under_review";
};

const statusLabel = (value) => {
  const normalized = normalizeStatusValue(value);
  if (normalized === "under_review") return "Under Review";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "attended") return "Attended";
  return "Under Review";
};

const toDateLabel = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const TrainingEventRegistrations = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEventScoped = Boolean(id);
  const [rows, setRows] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [eventOptions, setEventOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [eventCityFilter, setEventCityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionBusyId, setActionBusyId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exportScope, setExportScope] = useState("filtered");
  const [exportColumns, setExportColumns] = useState(
    exportColumnOptions.map((entry) => entry.key)
  );
  const [exportLoading, setExportLoading] = useState(false);

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchEventInfo = async () => {
    if (!isEventScoped) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/training-events/admin/${id}`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) return;
      setEventInfo(data?.data || null);
    } catch {
      setEventInfo(null);
    }
  };

  const fetchEventOptions = async () => {
    if (isEventScoped) return;
    try {
      const url = new URL(`${API_BASE_URL}/training-events/admin/list`);
      url.searchParams.set("limit", "300");
      const resp = await fetch(url.toString(), {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) return;
      setEventOptions(pickArray(data));
    } catch {
      setEventOptions([]);
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const url = isEventScoped
        ? new URL(`${API_BASE_URL}/training-events/admin/${id}/registrations`)
        : new URL(`${API_BASE_URL}/training-events/admin/registrations`);
      url.searchParams.set("limit", "500");
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }
      if (!isEventScoped && search.trim()) {
        url.searchParams.set("q", search.trim());
      }
      if (!isEventScoped && eventFilter) {
        url.searchParams.set("eventId", eventFilter);
      }
      if (!isEventScoped && eventCityFilter.trim()) {
        url.searchParams.set("eventCity", eventCityFilter.trim());
      }
      if (!isEventScoped && fromDate) {
        url.searchParams.set("from", fromDate);
      }
      if (!isEventScoped && toDate) {
        url.searchParams.set("to", toDate);
      }
      const resp = await fetch(url.toString(), {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to load registrations");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      const nextRows = pickArray(data);
      setRows(nextRows);
      const nextRowIds = new Set(nextRows.map((entry) => String(entry?._id || "")));
      setSelectedIds((prev) => prev.filter((entry) => nextRowIds.has(String(entry))));
    } catch (err) {
      setRows([]);
      setError(err?.message || "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventInfo();
    fetchEventOptions();
  }, [id]);

  useEffect(() => {
    fetchRows();
  }, [id, statusFilter, eventFilter, eventCityFilter, fromDate, toDate]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((entry) => {
      const status = normalizeStatusValue(entry?.status || entry?.registration_status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (eventFilter && String(entry?.event?._id || entry?.event || "") !== String(eventFilter)) {
        return false;
      }
      if (eventCityFilter.trim()) {
        const city = String(entry?.event_city || entry?.event?.eventCity || "").toLowerCase();
        if (!city.includes(eventCityFilter.trim().toLowerCase())) return false;
      }
      if (fromDate || toDate) {
        const created = new Date(entry?.createdAt || 0);
        if (!Number.isNaN(created.getTime())) {
          if (fromDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            if (created < start) return false;
          }
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (created > end) return false;
          }
        }
      }
      if (!needle) return true;
      const hay = [
        entry?.registrationId,
        entry?.doctorName,
        entry?.pmdcNumber,
        entry?.phoneNumber,
        entry?.emailAddress,
        entry?.clinicName,
        entry?.event?.title,
        entry?.event_city,
        entry?.event_location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, search, statusFilter, eventFilter, eventCityFilter, fromDate, toDate]);

  const filteredIds = useMemo(
    () => filteredRows.map((entry) => String(entry?._id || "")).filter(Boolean),
    [filteredRows]
  );
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((entry) => selectedIds.includes(entry));

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const prevSet = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach((entry) => prevSet.delete(entry));
      } else {
        filteredIds.forEach((entry) => prevSet.add(entry));
      }
      return Array.from(prevSet);
    });
  };

  const toggleSelectedRow = (idValue) => {
    const target = String(idValue || "");
    if (!target) return;
    setSelectedIds((prev) =>
      prev.includes(target) ? prev.filter((entry) => entry !== target) : [...prev, target]
    );
  };

  const updateRow = (idValue, patch) => {
    setRows((prev) =>
      prev.map((entry) => (String(entry?._id) === String(idValue) ? { ...entry, ...patch } : entry))
    );
  };

  const updateStatus = async (row, status) => {
    if (!row?._id) return;
    const normalizedStatus = normalizeStatusValue(status);
    const previous = normalizeStatusValue(row.status);
    updateRow(row._id, { status: normalizedStatus, registration_status: normalizedStatus });
    try {
      const resp = await fetch(
        `${API_BASE_URL}/training-events/admin/registrations/${row._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            status: normalizedStatus,
            internalNotes: row.internalNotes || "",
          }),
        }
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to update registration status");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      updateRow(row._id, data?.data || {});
    } catch (err) {
      updateRow(row._id, { status: previous, registration_status: previous });
      alert(err?.message || "Failed to update status");
    }
  };

  const updateNotes = async (row) => {
    if (!row?._id) return;
    try {
      const resp = await fetch(
        `${API_BASE_URL}/training-events/admin/registrations/${row._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            status: normalizeStatusValue(row.status),
            internalNotes: row.internalNotes || "",
          }),
        }
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to save notes");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      alert("Notes updated");
    } catch (err) {
      alert(err?.message || "Failed to save notes");
    }
  };

  const approveRegistration = async (row) => {
    if (!row?._id || actionBusyId) return;
    setActionBusyId(String(row._id));
    try {
      const resp = await fetch(
        `${API_BASE_URL}/training-events/admin/registrations/${row._id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to approve registration");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      updateRow(row._id, data?.data || {});
      alert("Registration approved and confirmation email processed.");
    } catch (err) {
      alert(err?.message || "Failed to approve registration");
    } finally {
      setActionBusyId("");
    }
  };

  const rejectRegistration = async (row) => {
    if (!row?._id || actionBusyId) return;
    const rejectionReason = window.prompt("Optional rejection reason", row?.rejection_reason || "");
    if (rejectionReason === null) return;
    setActionBusyId(String(row._id));
    try {
      const resp = await fetch(
        `${API_BASE_URL}/training-events/admin/registrations/${row._id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ rejectionReason }),
        }
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to reject registration");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      updateRow(row._id, data?.data || {});
      alert("Registration rejected and update email processed.");
    } catch (err) {
      alert(err?.message || "Failed to reject registration");
    } finally {
      setActionBusyId("");
    }
  };

  const toggleExportColumn = (key) => {
    setExportColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((entry) => entry !== key);
      }
      return [...prev, key];
    });
  };

  const executeExport = async () => {
    if (!exportColumns.length) {
      alert("Select at least one column for export.");
      return;
    }
    if (exportScope === "selected" && selectedIds.length === 0) {
      alert("Select at least one registration row first.");
      return;
    }
    setExportLoading(true);
    try {
      const url = new URL(
        `${API_BASE_URL}/training-events/admin/registrations/export/${exportFormat}`
      );
      if (exportScope !== "selected") {
        if (isEventScoped && id) {
          url.searchParams.set("eventId", id);
        }
        if (exportScope === "filtered") {
          if (!isEventScoped && eventFilter) {
            url.searchParams.set("eventId", eventFilter);
          }
          if (statusFilter !== "all") {
            url.searchParams.set("status", statusFilter);
          }
          if (eventCityFilter.trim()) {
            url.searchParams.set("eventCity", eventCityFilter.trim());
          }
          if (search.trim()) {
            url.searchParams.set("q", search.trim());
          }
          if (fromDate) {
            url.searchParams.set("from", fromDate);
          }
          if (toDate) {
            url.searchParams.set("to", toDate);
          }
        }
      }
      if (exportScope === "selected") {
        url.searchParams.set("ids", selectedIds.join(","));
      }
      url.searchParams.set("columns", exportColumns.join(","));

      const resp = await fetch(url.toString(), {
        headers: { ...getAuthHeaders() },
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}));
        const parsed = parseApiError(payload, "Failed to export registrations");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `training-event-registrations.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setShowExportModal(false);
      alert("Export completed successfully.");
    } catch (err) {
      alert(err?.message || "Failed to export registrations");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="page-container products-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Training Events</p>
          <h2>Event Registrations</h2>
          <p className="muted">
            {isEventScoped
              ? eventInfo?.title || "Manage registrations for this training event"
              : "Manage registrations across all training events"}
            .
          </p>
        </div>
        <div className="header-side">
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/training-events")}>
            ← Back
          </button>
          <button className="btn" type="button" onClick={() => setShowExportModal(true)}>
            Export Registrations
          </button>
        </div>
      </div>

      {error ? (
        <div className="error-panel">
          <p className="error-panel-title">{error}</p>
        </div>
      ) : null}

      <section className="card products-filter-bar">
        <div className="products-filter-controls">
          <label htmlFor="event-registration-search">Search</label>
          <input
            id="event-registration-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find by doctor, PMDC, phone, email, city"
          />
          {!isEventScoped ? (
            <>
              <label htmlFor="event-registration-event">Event</label>
              <select
                id="event-registration-event"
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
              >
                <option value="">All events</option>
                {eventOptions.map((entry) => (
                  <option key={entry?._id} value={entry?._id}>
                    {entry?.title || "Untitled event"}
                  </option>
                ))}
              </select>
              <label htmlFor="event-registration-city">Event City</label>
              <input
                id="event-registration-city"
                value={eventCityFilter}
                onChange={(event) => setEventCityFilter(event.target.value)}
                placeholder="Filter by event city"
              />
            </>
          ) : null}
          <label htmlFor="event-registration-status">Status</label>
          <select
            id="event-registration-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <label htmlFor="event-registration-from">From</label>
          <input
            id="event-registration-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <label htmlFor="event-registration-to">To</label>
          <input
            id="event-registration-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setEventFilter("");
              setEventCityFilter("");
              setFromDate("");
              setToDate("");
            }}
          >
            Reset Filters
          </button>
          <button className="btn secondary" type="button" onClick={() => setShowExportModal(true)}>
            Export
          </button>
          <span className="muted">Selected: {selectedIds.length}</span>
          <span className="muted">Showing {filteredRows.length} of {rows.length} registrations</span>
        </div>
      </section>

      <section className="card products-table-wrap">
        {loading ? (
          <div className="products-empty"><p>Loading registrations...</p></div>
        ) : filteredRows.length === 0 ? (
          <div className="products-empty"><p>No registrations found.</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table products-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      title="Select all filtered"
                    />
                  </th>
                  <th>Event</th>
                  <th>Event City</th>
                  <th>Doctor</th>
                  <th>Reg No.</th>
                  <th>PMDC</th>
                  <th>Phone / Email</th>
                  <th>Clinic</th>
                  <th>Registered At</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Internal Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row?._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(row?._id || ""))}
                        onChange={() => toggleSelectedRow(row?._id)}
                        title="Select registration"
                      />
                    </td>
                    <td>{row?.event?.title || eventInfo?.title || "-"}</td>
                    <td>
                      <strong>{row?.event_city || row?.event?.eventCity || "-"}</strong>
                      <br />
                      <small className="muted">{row?.event_location || row?.event?.venueAddress || "-"}</small>
                    </td>
                    <td>
                      <strong>{row?.doctorName || "-"}</strong>
                      <br />
                      <small className="muted">{row?.registrationId || "-"}</small>
                    </td>
                    <td>
                      <strong>{row?.registration_number || row?.registrationNumber || "-"}</strong>
                    </td>
                    <td>{row?.pmdcNumber || "-"}</td>
                    <td>
                      <div>{row?.phoneNumber || "-"}</div>
                      <small className="muted">{row?.emailAddress || "-"}</small>
                    </td>
                    <td>
                      <div>{row?.clinicName || "-"}</div>
                      <small className="muted">{row?.city || "-"}</small>
                    </td>
                    <td>{toDateLabel(row?.createdAt)}</td>
                    <td>
                      <select
                        value={normalizeStatusValue(row?.status || row?.registration_status)}
                        onChange={(event) => updateStatus(row, event.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div className="actions" style={{ gap: 8 }}>
                        <button
                          className="btn"
                          type="button"
                          title="Approve registration"
                          onClick={() => approveRegistration(row)}
                          disabled={actionBusyId === String(row?._id)}
                          style={{ minWidth: 54, background: "#16a34a", borderColor: "#16a34a" }}
                        >
                          ✅
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          title="Reject registration"
                          onClick={() => rejectRegistration(row)}
                          disabled={actionBusyId === String(row?._id)}
                          style={{ minWidth: 54, color: "#b91c1c", borderColor: "#fecaca" }}
                        >
                          ❌
                        </button>
                      </div>
                      {row?.rejection_reason ? (
                        <small className="muted" style={{ display: "block", marginTop: 6 }}>
                          Reason: {row.rejection_reason}
                        </small>
                      ) : null}
                    </td>
                    <td style={{ minWidth: 240 }}>
                      <textarea
                        rows={2}
                        value={row?.internalNotes || ""}
                        onChange={(event) =>
                          updateRow(row._id, { internalNotes: event.target.value })
                        }
                        placeholder="Add internal notes..."
                      />
                      <div className="actions" style={{ marginTop: 8 }}>
                        <button className="btn secondary" type="button" onClick={() => updateNotes(row)}>
                          Save Note
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showExportModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={() => !exportLoading && setShowExportModal(false)}
        >
          <div
            className="card"
            style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h3 style={{ marginBottom: 0 }}>Export Registrations</h3>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
              >
                Close
              </button>
            </div>
            <p className="muted">
              Choose format, export scope, and columns for enterprise-ready reports.
            </p>

            <div className="row g-3">
              <div className="col-md-4">
                <label htmlFor="registration-export-format">Export Format</label>
                <select
                  id="registration-export-format"
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value)}
                >
                  {exportFormats.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-8">
                <label htmlFor="registration-export-scope">Export Scope</label>
                <select
                  id="registration-export-scope"
                  value={exportScope}
                  onChange={(event) => setExportScope(event.target.value)}
                >
                  <option value="filtered">Current filtered registrations</option>
                  <option value="all">All registrations (ignores selected rows)</option>
                  <option value="selected">
                    Selected registrations only ({selectedIds.length} selected)
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label style={{ marginBottom: 8, display: "block" }}>Columns</label>
              <div className="row g-2">
                {exportColumnOptions.map((column) => (
                  <div className="col-md-6" key={column.key}>
                    <label
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "8px 10px",
                        marginBottom: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(column.key)}
                        onChange={() => toggleExportColumn(column.key)}
                      />
                      <span>{column.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="muted">
                Active filters will be included: status, event, event city, date range, and search.
              </span>
              <button className="btn" type="button" onClick={executeExport} disabled={exportLoading}>
                {exportLoading ? "Processing..." : "Download Export"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TrainingEventRegistrations;
