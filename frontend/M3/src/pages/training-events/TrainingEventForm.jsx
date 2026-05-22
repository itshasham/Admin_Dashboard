import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";

const defaultFields = [
  {
    key: "fullName",
    label: "Doctor Full Name",
    type: "text",
    placeholder: "Enter full name",
    required: true,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
  {
    key: "pmdcNumber",
    label: "PMDC Number",
    type: "text",
    placeholder: "Enter PMDC number",
    required: true,
    visible: true,
    validation: { pattern: "^[A-Za-z0-9\\-/]{4,40}$", minLength: "", maxLength: "" },
  },
  {
    key: "phoneNumber",
    label: "Phone Number",
    type: "tel",
    placeholder: "+92...",
    required: true,
    visible: true,
    validation: { pattern: "^[+]?[0-9\\s\\-()]{7,20}$", minLength: "", maxLength: "" },
  },
  {
    key: "emailAddress",
    label: "Email Address",
    type: "email",
    placeholder: "doctor@clinic.com",
    required: true,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
  {
    key: "clinicName",
    label: "Clinic/Hospital Name",
    type: "text",
    placeholder: "Clinic or hospital name",
    required: true,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
  {
    key: "specialization",
    label: "Specialization",
    type: "text",
    placeholder: "Dermatology, Aesthetic Medicine, etc.",
    required: true,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
  {
    key: "city",
    label: "City",
    type: "text",
    placeholder: "City",
    required: true,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
  {
    key: "experience",
    label: "Experience (optional)",
    type: "text",
    placeholder: "e.g. 5 years",
    required: false,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
  {
    key: "additionalNotes",
    label: "Additional Notes (optional)",
    type: "textarea",
    placeholder: "Any extra details",
    required: false,
    visible: true,
    validation: { pattern: "", minLength: "", maxLength: "" },
  },
];

const emptyEvent = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  category: "Training Event",
  eventDate: "",
  startTime: "",
  endTime: "",
  venue: "",
  location: "",
  eventCity: "Lahore",
  venueAddress: "",
  mapLocation: "",
  onlineMeetingLink: "",
  organizerName: "NEES Medical Inc.",
  contactInfo: {
    phone: "",
    email: "",
    whatsapp: "",
  },
  images: [],
  registrationFields: defaultFields,
  registrationEnabled: true,
  featured: false,
  isActive: true,
  registrationClosedMessage: "Registration Closed",
  registrationUnavailableMessage: "Registrations are currently unavailable",
  registrationDeadline: "",
  seatsLimit: 0,
};

const toSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const cleanString = (value) => String(value || "").trim();

const parsePositiveLength = (raw) => {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string" && raw.trim() === "") return "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return "";
  return parsed > 0 ? parsed : "";
};

const normalizeFields = (fields = []) => {
  const list = Array.isArray(fields) ? fields : [];
  if (!list.length) return defaultFields;
  return list.map((field, index) => ({
    key: cleanString(field?.key || `custom_field_${index + 1}`),
    label: cleanString(field?.label || field?.key || `Field ${index + 1}`),
    type: ["text", "email", "tel", "number", "textarea"].includes(field?.type) ? field.type : "text",
    placeholder: cleanString(field?.placeholder || ""),
    required: Boolean(field?.required),
    visible: field?.visible !== false,
    validation: {
      pattern: cleanString(field?.validation?.pattern || ""),
      minLength: parsePositiveLength(field?.validation?.minLength),
      maxLength: parsePositiveLength(field?.validation?.maxLength),
    },
  }));
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const eventCityOptions = [
  "Lahore",
  "Islamabad",
  "Karachi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Hyderabad",
  "Rawalpindi",
];

const TrainingEventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [eventData, setEventData] = useState(emptyEvent);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState([]);

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const getSafeEventId = useMemo(() => eventData?._id || id || "", [eventData?._id, id]);
  const eventCityMode = useMemo(() => {
    const city = cleanString(eventData.eventCity);
    if (!city) return "preset";
    return eventCityOptions.includes(city) ? "preset" : "custom";
  }, [eventData.eventCity]);

  const loadEvent = async () => {
    if (!isEdit) return;
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/training-events/admin/${id}`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to load training event");
      const item = data?.data || {};
      setEventData({
        ...emptyEvent,
        ...item,
        eventDate: toDateInput(item?.eventDate),
        registrationDeadline: toDateInput(item?.registrationDeadline),
        eventCity: cleanString(item?.eventCity || item?.location || ""),
        venueAddress: cleanString(item?.venueAddress || item?.location || ""),
        mapLocation: cleanString(item?.mapLocation || ""),
        images: Array.isArray(item?.images) ? item.images.slice(0, MAX_IMAGES) : [],
        registrationFields: normalizeFields(item?.registrationFields),
        contactInfo: {
          ...emptyEvent.contactInfo,
          ...(item?.contactInfo || {}),
        },
      });
    } catch (err) {
      setError(err?.message || "Failed to load training event");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  useEffect(() => {
    return () => {
      pendingUploads.forEach((entry) => {
        if (entry?.preview) URL.revokeObjectURL(entry.preview);
      });
    };
  }, [pendingUploads]);

  const handleRootChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEventData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "title" && !String(prev.slug || "").trim()) {
        next.slug = toSlug(value);
      }
      return next;
    });
  };

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setEventData((prev) => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [name]: value,
      },
    }));
  };

  const handleEventCityModeChange = (mode) => {
    if (mode === "custom") {
      setEventData((prev) => ({ ...prev, eventCity: "" }));
      return;
    }
    setEventData((prev) => ({
      ...prev,
      eventCity: eventCityOptions.includes(prev.eventCity) ? prev.eventCity : eventCityOptions[0],
    }));
  };

  const validateFiles = (files) => {
    const selected = Array.from(files || []);
    const issues = [];
    const accepted = [];
    selected.forEach((file) => {
      if (!file) return;
      if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) {
        issues.push(`${file.name}: unsupported format. Use JPG/JPEG/PNG/WEBP.`);
        return;
      }
      if (Number(file.size || 0) > MAX_SIZE) {
        issues.push(`${file.name}: exceeds 5MB.`);
        return;
      }
      accepted.push(file);
    });
    return { issues, accepted };
  };

  const queueFiles = (files) => {
    const currentCount = (eventData.images || []).length + pendingUploads.length;
    const remaining = Math.max(0, MAX_IMAGES - currentCount);
    if (remaining <= 0) {
      setError("Maximum 5 images already selected.");
      return;
    }
    const list = Array.from(files || []).slice(0, remaining);
    const { issues, accepted } = validateFiles(list);
    if (issues.length) {
      setError(issues.join(" "));
    }
    if (!accepted.length) return;
    const nextQueued = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingUploads((prev) => [...prev, ...nextQueued].slice(0, MAX_IMAGES));
    setError("");
  };

  const handleFileInput = (event) => {
    queueFiles(event.target.files || []);
    event.target.value = "";
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    queueFiles(event.dataTransfer?.files || []);
  };

  const removePendingUpload = (idToRemove) => {
    setPendingUploads((prev) => {
      const hit = prev.find((entry) => entry.id === idToRemove);
      if (hit?.preview) URL.revokeObjectURL(hit.preview);
      return prev.filter((entry) => entry.id !== idToRemove);
    });
  };

  const uploadPendingImages = async () => {
    if (!pendingUploads.length) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      pendingUploads.slice(0, MAX_IMAGES).forEach((entry) => {
        fd.append("images", entry.file);
      });
      const resp = await fetch(`${API_BASE_URL}/cloudinary/add-multiple-img`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: fd,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to upload images");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      const urls = Array.isArray(data?.data)
        ? data.data.map((entry) => cleanString(entry?.url || entry)).filter(Boolean)
        : [];
      setEventData((prev) => ({
        ...prev,
        images: Array.from(new Set([...(prev.images || []), ...urls])).slice(0, MAX_IMAGES),
      }));
      pendingUploads.forEach((entry) => {
        if (entry?.preview) URL.revokeObjectURL(entry.preview);
      });
      setPendingUploads([]);
    } catch (err) {
      setError(err?.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const removeExistingImage = (index) => {
    setEventData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== index),
    }));
  };

  const addField = () => {
    setEventData((prev) => ({
      ...prev,
      registrationFields: [
        ...(prev.registrationFields || []),
        {
          key: `custom_field_${(prev.registrationFields || []).length + 1}`,
          label: "Custom Field",
          type: "text",
          placeholder: "",
          required: false,
          visible: true,
          validation: { pattern: "", minLength: "", maxLength: "" },
        },
      ],
    }));
  };

  const updateField = (index, patch) => {
    setEventData((prev) => ({
      ...prev,
      registrationFields: (prev.registrationFields || []).map((field, idx) =>
        idx === index ? { ...field, ...patch } : field
      ),
    }));
  };

  const removeField = (index) => {
    const field = eventData.registrationFields?.[index];
    if (field && defaultFields.some((entry) => entry.key === field.key)) {
      updateField(index, { visible: false, required: false });
      return;
    }
    setEventData((prev) => ({
      ...prev,
      registrationFields: (prev.registrationFields || []).filter((_, idx) => idx !== index),
    }));
  };

  const validateForm = () => {
    const issues = [];
    if (!cleanString(eventData.title)) issues.push("Event title is required");
    if (!cleanString(eventData.shortDescription)) issues.push("Short description is required");
    if (!cleanString(eventData.fullDescription)) issues.push("Full description is required");
    if (!cleanString(eventData.eventDate)) issues.push("Event date is required");
    if (!cleanString(eventData.startTime)) issues.push("Event start time is required");
    if (!cleanString(eventData.eventCity)) issues.push("Event city is required");
    if (!cleanString(eventData.venueAddress)) issues.push("Full venue address is required");
    if (!cleanString(eventData.venue) && !cleanString(eventData.location)) {
      issues.push("Venue or location is required");
    }
    if ((eventData.images || []).length === 0) {
      issues.push("At least one event image is required");
    }
    if ((eventData.images || []).length > MAX_IMAGES) {
      issues.push("Maximum 5 images are allowed");
    }
    (eventData.registrationFields || []).forEach((field, index) => {
      if (!cleanString(field?.key)) issues.push(`Registration field #${index + 1} must have a key`);
      if (!cleanString(field?.label)) issues.push(`Registration field #${index + 1} must have a label`);
    });
    return issues;
  };

  const toPayload = () => ({
    title: cleanString(eventData.title),
    slug: cleanString(eventData.slug) || toSlug(eventData.title),
    shortDescription: cleanString(eventData.shortDescription),
    fullDescription: String(eventData.fullDescription || "").trim(),
    category: cleanString(eventData.category || "Training Event"),
    eventDate: cleanString(eventData.eventDate),
    startTime: cleanString(eventData.startTime),
    endTime: cleanString(eventData.endTime),
    venue: cleanString(eventData.venue),
    eventCity: cleanString(eventData.eventCity),
    venueAddress: cleanString(eventData.venueAddress),
    mapLocation: cleanString(eventData.mapLocation),
    location: cleanString(eventData.location),
    onlineMeetingLink: cleanString(eventData.onlineMeetingLink),
    organizerName: cleanString(eventData.organizerName),
    contactInfo: {
      phone: cleanString(eventData.contactInfo?.phone),
      email: cleanString(eventData.contactInfo?.email),
      whatsapp: cleanString(eventData.contactInfo?.whatsapp),
    },
    images: (eventData.images || []).slice(0, MAX_IMAGES),
    registrationFields: normalizeFields(eventData.registrationFields || []),
    registrationEnabled: Boolean(eventData.registrationEnabled),
    featured: Boolean(eventData.featured),
    isActive: Boolean(eventData.isActive),
    registrationClosedMessage: cleanString(eventData.registrationClosedMessage),
    registrationUnavailableMessage: cleanString(eventData.registrationUnavailableMessage),
    registrationDeadline: cleanString(eventData.registrationDeadline) || null,
    seatsLimit: Number(eventData.seatsLimit || 0),
  });

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setValidationIssues([]);

    if (pendingUploads.length) {
      setError("Please upload or remove pending selected images before saving.");
      setSaving(false);
      return;
    }

    const issues = validateForm();
    if (issues.length) {
      setError(`Please fix ${issues.length} field${issues.length > 1 ? "s" : ""} and try again.`);
      setValidationIssues(issues);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const payload = toPayload();
      const endpoint = isEdit
        ? `${API_BASE_URL}/training-events/admin/${id}`
        : `${API_BASE_URL}/training-events/admin`;
      const method = isEdit ? "PUT" : "POST";
      const resp = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Failed to save training event");
        throw new Error(parsed.issues.join(" ") || parsed.summary);
      }
      navigate("/admin/training-events");
    } catch (err) {
      setError(err?.message || "Failed to save training event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container products-page">
        <div className="card product-list-state">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="page-container products-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Training Events</p>
          <h2>{isEdit ? "Edit Training Event" : "Create Training Event"}</h2>
          <p className="muted">
            Configure event details, media gallery, registration fields, and visibility toggles.
          </p>
        </div>
        <div className="header-side">
          <button className="btn secondary" type="button" onClick={() => navigate("/admin/training-events")}>
            ← Back
          </button>
          {isEdit && getSafeEventId ? (
            <button
              className="btn"
              type="button"
              onClick={() => navigate(`/admin/training-events/${getSafeEventId}/registrations`)}
            >
              View Registrations
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="error-panel">
          <p className="error-panel-title">{error}</p>
          {validationIssues.length ? (
            <ul className="error-panel-list">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="product-form-shell">
        <div className="product-side">
          <div className="card product-preview-card">
            <div className="product-preview-media">
              {(eventData.images || [])[0] ? (
                <img src={eventData.images[0]} alt="Event cover" />
              ) : (
                <span className="muted">No cover image yet</span>
              )}
            </div>
            <div className="product-preview-body">
              <span className="product-preview-title">{eventData.title || "Untitled Event"}</span>
              <div className="product-preview-row">
                <span>Date</span>
                <strong>{eventData.eventDate || "--"}</strong>
              </div>
              <div className="product-preview-row">
                <span>Time</span>
                <strong>
                  {eventData.startTime || "--"}
                  {eventData.endTime ? ` - ${eventData.endTime}` : ""}
                </strong>
              </div>
              <div className="product-preview-row">
                <span>Registration</span>
                <strong>{eventData.registrationEnabled ? "Open" : "Closed"}</strong>
              </div>
              <div className="product-preview-row">
                <span>Event City</span>
                <strong>{eventData.eventCity || "--"}</strong>
              </div>
              <div className="product-preview-row">
                <span>Featured</span>
                <strong>{eventData.featured ? "Yes" : "No"}</strong>
              </div>
            </div>
          </div>

          <div className="card product-media-card">
            <div className="section-title">
              <h3>Event Images</h3>
              <span className="hint">Maximum 5 images (JPG/JPEG/PNG/WEBP, up to 5MB each)</span>
            </div>

            <div
              style={{
                border: dragActive ? "2px dashed #0f766e" : "2px dashed #cbd5e1",
                borderRadius: 12,
                padding: 16,
                background: dragActive ? "#ecfeff" : "#f8fafc",
                marginBottom: 12,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={onDrop}
            >
              <p className="muted" style={{ marginBottom: 10 }}>
                Drag and drop images here, or browse from your computer.
              </p>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileInput}
              />
            </div>

            {pendingUploads.length ? (
              <>
                <div className="image-grid">
                  {pendingUploads.map((entry) => (
                    <div className="image-tile" key={entry.id}>
                      <img src={entry.preview} alt={entry.file?.name || "Pending upload"} />
                      <button type="button" className="image-remove" onClick={() => removePendingUpload(entry.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={uploadPendingImages}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Selected Images"}
                  </button>
                </div>
              </>
            ) : null}

            {(eventData.images || []).length ? (
              <div className="image-grid">
                {(eventData.images || []).map((url, index) => (
                  <div className="image-tile" key={`${url}-${index}`}>
                    <img src={url} alt={`event-${index + 1}`} />
                    <button type="button" className="image-remove" onClick={() => removeExistingImage(index)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="image-empty">No uploaded images yet.</p>
            )}
          </div>
        </div>

        <div className="card compact product-form-card">
          <div className="product-form-grid">
            <div className="section-title" style={{ gridColumn: "1 / -1" }}>
              <h3>Basic Event Information</h3>
              <span className="hint">Title, date/time, venue, organizer, and public details</span>
            </div>

            <label className="field">
              Event Title
              <input name="title" value={eventData.title} onChange={handleRootChange} required />
            </label>
            <label className="field">
              Event Slug
              <input name="slug" value={eventData.slug} onChange={handleRootChange} placeholder="Auto generated from title" />
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Short Description
              <textarea
                rows={2}
                name="shortDescription"
                value={eventData.shortDescription}
                onChange={handleRootChange}
                required
              />
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Full Description / Rich Text Details
              <textarea
                rows={8}
                name="fullDescription"
                value={eventData.fullDescription}
                onChange={handleRootChange}
                required
              />
            </label>

            <label className="field">
              Event Category
              <input name="category" value={eventData.category} onChange={handleRootChange} />
            </label>
            <label className="field">
              Event Date
              <input type="date" name="eventDate" value={eventData.eventDate} onChange={handleRootChange} required />
            </label>

            <label className="field">
              Event Start Time
              <input type="time" name="startTime" value={eventData.startTime} onChange={handleRootChange} required />
            </label>
            <label className="field">
              Event End Time
              <input type="time" name="endTime" value={eventData.endTime} onChange={handleRootChange} />
            </label>

            <label className="field">
              Venue
              <input name="venue" value={eventData.venue} onChange={handleRootChange} />
            </label>
            <label className="field">
              Event City Mode
              <select
                value={eventCityMode}
                onChange={(event) => handleEventCityModeChange(event.target.value)}
              >
                <option value="preset">Select from predefined cities</option>
                <option value="custom">Custom city input</option>
              </select>
            </label>

            {eventCityMode === "preset" ? (
              <label className="field">
                Event City
                <select
                  name="eventCity"
                  value={eventCityOptions.includes(eventData.eventCity) ? eventData.eventCity : eventCityOptions[0]}
                  onChange={handleRootChange}
                >
                  {eventCityOptions.map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                Event City (Custom)
                <input
                  name="eventCity"
                  value={eventData.eventCity}
                  onChange={handleRootChange}
                  placeholder="Enter city name"
                  required
                />
              </label>
            )}

            <label className="field">
              Location
              <input name="location" value={eventData.location} onChange={handleRootChange} />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Full Venue Address
              <input
                name="venueAddress"
                value={eventData.venueAddress}
                onChange={handleRootChange}
                placeholder="Street, Area, City"
                required
              />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Google Maps Location (optional)
              <input
                type="url"
                name="mapLocation"
                value={eventData.mapLocation}
                onChange={handleRootChange}
                placeholder="https://maps.google.com/..."
              />
            </label>

            <label className="field">
              Online Meeting Link (optional)
              <input
                type="url"
                name="onlineMeetingLink"
                value={eventData.onlineMeetingLink}
                onChange={handleRootChange}
                placeholder="https://..."
              />
            </label>
            <label className="field">
              Organizer Name
              <input name="organizerName" value={eventData.organizerName} onChange={handleRootChange} />
            </label>

            <label className="field">
              Contact Phone
              <input
                name="phone"
                value={eventData.contactInfo?.phone || ""}
                onChange={handleContactChange}
              />
            </label>
            <label className="field">
              Contact Email
              <input
                type="email"
                name="email"
                value={eventData.contactInfo?.email || ""}
                onChange={handleContactChange}
              />
            </label>

            <label className="field">
              WhatsApp
              <input
                name="whatsapp"
                value={eventData.contactInfo?.whatsapp || ""}
                onChange={handleContactChange}
              />
            </label>
            <label className="field">
              Seats Limit (optional)
              <input
                type="number"
                min="0"
                name="seatsLimit"
                value={eventData.seatsLimit}
                onChange={handleRootChange}
              />
            </label>

            <label className="field">
              Registration Deadline (optional)
              <input
                type="date"
                name="registrationDeadline"
                value={eventData.registrationDeadline || ""}
                onChange={handleRootChange}
              />
            </label>
            <div className="field status-row">
              <label className="inline-switch">
                <input
                  type="checkbox"
                  name="registrationEnabled"
                  checked={Boolean(eventData.registrationEnabled)}
                  onChange={handleRootChange}
                />
                Registration Enabled
              </label>
              <label className="inline-switch">
                <input
                  type="checkbox"
                  name="featured"
                  checked={Boolean(eventData.featured)}
                  onChange={handleRootChange}
                />
                Featured Event
              </label>
              <label className="inline-switch">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={Boolean(eventData.isActive)}
                  onChange={handleRootChange}
                />
                Event Active
              </label>
            </div>

            <label className="field">
              Registration Closed Message
              <input
                name="registrationClosedMessage"
                value={eventData.registrationClosedMessage}
                onChange={handleRootChange}
              />
            </label>
            <label className="field">
              Registration Unavailable Message
              <input
                name="registrationUnavailableMessage"
                value={eventData.registrationUnavailableMessage}
                onChange={handleRootChange}
              />
            </label>

            <div className="section-title" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
              <h3>Dynamic Registration Form Builder</h3>
              <span className="hint">Configure required/optional, show/hide, placeholders, and validation rules</span>
            </div>

            <div style={{ gridColumn: "1 / -1", overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Placeholder</th>
                    <th>Required</th>
                    <th>Show</th>
                    <th>Validation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(eventData.registrationFields || []).map((field, index) => (
                    <tr key={`${field.key}-${index}`}>
                      <td>
                        <input
                          value={field.key}
                          onChange={(e) => updateField(index, { key: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value })}
                        >
                          <option value="text">text</option>
                          <option value="email">email</option>
                          <option value="tel">tel</option>
                          <option value="number">number</option>
                          <option value="textarea">textarea</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(field.required)}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={field.visible !== false}
                          onChange={(e) => updateField(index, { visible: e.target.checked })}
                        />
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <input
                          placeholder="Regex pattern"
                          value={field.validation?.pattern || ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...(field.validation || {}),
                                pattern: e.target.value,
                              },
                            })
                          }
                        />
                      </td>
                      <td>
                        <button className="btn danger" type="button" onClick={() => removeField(index)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions" style={{ gridColumn: "1 / -1" }}>
              <button className="btn secondary" type="button" onClick={addField}>
                + Add Custom Field
              </button>
            </div>

            <div className="sticky-actions" style={{ gridColumn: "1 / -1" }}>
              <div className="actions">
                <button className="btn secondary" type="button" onClick={() => navigate("/admin/training-events")}>
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={saving || uploading}>
                  {saving ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TrainingEventForm;
