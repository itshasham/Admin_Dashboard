import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";

const emptyMachine = {
  name: "",
  modelNumber: "",
  brand: "",
  productUrl: "",
  description: "",
  availability: "available",
  images: [],
  contactEmail: "",
  whatsappNumber: "",
  inquiryOnly: true,
  isInquiryOnly: true,
  professionalUseOnly: true,
  isActive: true,
};

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.brands)) return payload.brands;
  if (Array.isArray(payload.result)) return payload.result;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  if (payload.data && Array.isArray(payload.data.result)) return payload.data.result;
  return [];
};

const pickCloudinaryArray = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.images)) return payload.images;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.images)) return payload.data.images;
  return [];
};

const normalizeImageUrls = (images) => {
  const list = Array.isArray(images) ? images : [];
  const seen = new Set();
  const out = [];

  list.forEach((entry) => {
    const url = String(typeof entry === "string" ? entry : entry?.url || entry?.img || "").trim();
    if (!url) return;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(url);
  });

  return out;
};

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const MachineForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [machine, setMachine] = useState(emptyMachine);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState([]);

  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [imageManagerLoading, setImageManagerLoading] = useState(false);
  const [imageManagerError, setImageManagerError] = useState("");
  const [imageManagerQuery, setImageManagerQuery] = useState("");
  const [imageManagerImages, setImageManagerImages] = useState([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState({});

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/brand/all`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load brands");

      const list = pickArray(data);
      const normalized = list
        .map((entry, idx) => ({
          id: entry?._id || entry?.id || entry?.uuid || `brand-${idx}`,
          name: String(entry?.name || entry?.brandName || entry?.title || "").trim(),
        }))
        .filter((entry) => entry.name);

      setBrands(normalized);
    } catch {
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchMachine = async () => {
    if (!isEdit) return;

    setLoading(true);
    setError("");
    setValidationIssues([]);

    try {
      const resp = await fetch(`${API_BASE_URL}/machines/${id}`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load machine");

      const payload = data?.data || data;
      const resolvedBrand =
        typeof payload?.brand === "string"
          ? payload.brand
          : payload?.brand?.name || "";

      setMachine({
        ...emptyMachine,
        ...payload,
        brand: String(resolvedBrand || "").trim(),
        productUrl: String(payload?.productUrl || "").trim(),
        images: normalizeImageUrls(payload?.images),
      });
    } catch (err) {
      setError(err.message || "Failed to load machine");
    } finally {
      setLoading(false);
    }
  };

  const fetchImageManagerImages = async (queryText = imageManagerQuery) => {
    setImageManagerLoading(true);
    setImageManagerError("");
    try {
      const url = new URL(`${API_BASE_URL}/cloudinary/images`);
      if (String(queryText || "").trim()) {
        url.searchParams.set("q", String(queryText).trim());
      }
      const resp = await fetch(url.toString(), {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || data?.error || "Failed to load image manager");

      const normalized = pickCloudinaryArray(data)
        .map((entry, idx) => ({
          id: entry?._id || entry?.publicId || entry?.id || `manager-image-${idx}`,
          publicId: entry?.publicId || entry?.id || "",
          url: String(entry?.url || entry?.img || "").trim(),
        }))
        .filter((entry) => entry.url);

      const unique = new Map();
      normalized.forEach((entry) => {
        if (!unique.has(entry.url)) unique.set(entry.url, entry);
      });

      setImageManagerImages(Array.from(unique.values()));
    } catch (err) {
      setImageManagerError(err.message || "Failed to load image manager");
      setImageManagerImages([]);
    } finally {
      setImageManagerLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchMachine();
  }, [id]);

  useEffect(() => {
    if (!imageManagerOpen) return;
    fetchImageManagerImages();
  }, [imageManagerOpen]);

  const selectedBrandNames = useMemo(() => new Set(brands.map((entry) => entry.name)), [brands]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      if (name === "inquiryOnly") {
        setMachine((prev) => ({ ...prev, inquiryOnly: checked, isInquiryOnly: checked }));
        return;
      }
      setMachine((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setMachine((prev) => ({ ...prev, [name]: value }));
  };

  const handleBrandSelect = (event) => {
    setMachine((prev) => ({ ...prev, brand: event.target.value }));
  };

  const mergeImages = (urls) => {
    const normalized = normalizeImageUrls(urls);
    if (!normalized.length) return;

    setMachine((prev) => ({
      ...prev,
      images: normalizeImageUrls([...(prev.images || []), ...normalized]),
    }));
  };

  const addImage = () => {
    const value = String(newImageUrl || "").trim();
    if (!value) return;
    if (!isValidHttpUrl(value)) {
      setImageManagerError("Please enter a valid image URL starting with http or https.");
      return;
    }

    mergeImages([value]);
    setNewImageUrl("");
    setImageManagerError("");
  };

  const removeImage = (idx) => {
    setMachine((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, index) => index !== idx),
    }));
  };

  const openImageManager = () => {
    setSelectedImageUrls({});
    setImageManagerError("");
    setImageManagerOpen(true);
  };

  const closeImageManager = () => {
    setImageManagerOpen(false);
    setSelectedImageUrls({});
    setImageManagerError("");
    setImageManagerQuery("");
  };

  const toggleImageSelection = (url) => {
    const safeUrl = String(url || "").trim();
    if (!safeUrl) return;

    setSelectedImageUrls((prev) => ({
      ...prev,
      [safeUrl]: !prev[safeUrl],
    }));
  };

  const addSelectedImages = () => {
    const urls = Object.keys(selectedImageUrls).filter((url) => selectedImageUrls[url]);
    if (!urls.length) {
      setImageManagerError("Select at least one image.");
      return;
    }

    mergeImages(urls);
    closeImageManager();
  };

  const selectedImageCount = Object.keys(selectedImageUrls).filter((url) => selectedImageUrls[url]).length;

  const validate = () => {
    const issues = [];

    if (!machine.name?.trim()) issues.push("Name is required");
    if (!machine.modelNumber?.trim()) issues.push("Model number is required");
    if (!machine.description?.trim()) issues.push("Description is required");

    if (machine.productUrl && !isValidHttpUrl(machine.productUrl)) {
      issues.push("Product URL must be a valid link (http/https)");
    }

    if (!machine.contactEmail && !machine.whatsappNumber) {
      issues.push("Provide at least one contact method (Email or WhatsApp)");
    }

    return issues;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setValidationIssues([]);

    const localErrors = validate();
    if (localErrors.length) {
      setError(`Please fix ${localErrors.length} field${localErrors.length === 1 ? "" : "s"} and try again.`);
      setValidationIssues(localErrors);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const payload = {
      name: machine.name,
      modelNumber: machine.modelNumber,
      brand: machine.brand,
      productUrl: machine.productUrl,
      description: machine.description,
      availability: machine.availability,
      images: normalizeImageUrls(machine.images),
      contactEmail: machine.contactEmail || "",
      whatsappNumber: machine.whatsappNumber || "",
      inquiryOnly: Boolean(machine.inquiryOnly),
      isInquiryOnly: Boolean(machine.inquiryOnly),
      professionalUseOnly: Boolean(machine.professionalUseOnly),
      isActive: Boolean(machine.isActive),
    };

    try {
      const endpoint = isEdit ? `${API_BASE_URL}/machines/${id}` : `${API_BASE_URL}/machines`;
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
        const fallbackSummary =
          resp.status === 401
            ? "Your session has expired. Please log in again."
            : resp.status === 403
              ? "You do not have permission to add or edit machines."
              : `Save failed (${resp.status}). Please review and try again.`;
        const parsed = parseApiError(data, fallbackSummary);
        setError(parsed.summary);
        setValidationIssues(parsed.issues);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      window.location.href = "/admin/machines";
    } catch (err) {
      setError(err.message || "Failed to save machine");
      setValidationIssues([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const previewImage = Array.isArray(machine.images) && machine.images.length ? machine.images[0] : "";

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>{isEdit ? "Edit Machine" : "Add Machine"}</h2>
          <p className="muted">Machines are inquiry-first listings for customer view.</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/machines")}>← Back</button>
      </div>

      {error && (
        <div className="error-panel" role="alert" aria-live="polite">
          <p className="error-panel-title">{error}</p>
          {validationIssues.length > 0 && (
            <ul className="error-panel-list">
              {validationIssues.map((issue, index) => (
                <li key={`${issue}-${index}`}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading && <div>Loading...</div>}

      {!loading && (
        <div className="product-form-shell">
          <div className="product-side">
            <div className="card product-preview-card">
              <div className="product-preview-media">
                {previewImage ? (
                  <img src={previewImage} alt="Machine preview" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                ) : (
                  <div className="preview-placeholder">No image selected</div>
                )}
              </div>
              <div className="product-preview-body">
                <span className="product-preview-title">{machine.name || "Untitled Machine"}</span>
                <div className="product-preview-row">
                  <span>Model</span>
                  <strong>{machine.modelNumber || "N/A"}</strong>
                </div>
                <div className="product-preview-row">
                  <span>Brand</span>
                  <strong>{machine.brand || "Unassigned"}</strong>
                </div>
                <div className="product-preview-row">
                  <span>Availability</span>
                  <strong>{machine.availability || "available"}</strong>
                </div>
              </div>
            </div>

            <div className="card product-media-card">
              <div className="section-title">
                <h3>Media</h3>
                <span className="hint">Pick image URLs quickly from Image Manager</span>
              </div>

              <label>Machine Images</label>
              <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn secondary" onClick={openImageManager}>Select from Image Manager</button>
                {Array.isArray(machine.images) && machine.images.length > 0 && (
                  <button type="button" className="btn ghost" onClick={() => setMachine((prev) => ({ ...prev, images: [] }))}>Clear All</button>
                )}
              </div>

              <div className="image-input-row image-input-row-three" style={{ marginTop: 10 }}>
                <input
                  type="url"
                  placeholder="https://example.com/machine-image.jpg"
                  value={newImageUrl}
                  onChange={(event) => setNewImageUrl(event.target.value)}
                />
                <button type="button" className="btn ghost" onClick={addImage}>Add URL</button>
                <button type="button" className="btn secondary" onClick={openImageManager}>Browse</button>
              </div>
              <div className="subtext">You can add manual URLs or select multiple URLs from Image Manager.</div>

              {Array.isArray(machine.images) && machine.images.length > 0 ? (
                <div className="image-grid">
                  {machine.images.map((image, idx) => (
                    <div className="image-tile" key={`${image}-${idx}`}>
                      <img src={image} alt={`machine-${idx + 1}`} />
                      <button type="button" className="image-remove" onClick={() => removeImage(idx)}>x</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="image-empty">No machine images added yet.</div>
              )}
            </div>
          </div>

          <div className="card compact product-form-card">
            <form onSubmit={handleSubmit} className="product-form-grid">
              <div className="section appear">
                <div className="section-title">
                  <h3>Basics</h3>
                  <span className="hint">Core machine information</span>
                </div>
                <div className="form-table">
                  <div className="form-row"><div className="form-cell">Name *</div><div className="form-cell"><input name="name" value={machine.name} onChange={handleChange} required /></div></div>
                  <div className="form-row"><div className="form-cell">Model Number *</div><div className="form-cell"><input name="modelNumber" value={machine.modelNumber} onChange={handleChange} required /></div></div>
                  <div className="form-row">
                    <div className="form-cell">Brand</div>
                    <div className="form-cell">
                      <select value={machine.brand || ""} onChange={handleBrandSelect} disabled={loadingBrands}>
                        <option value="">-- Select brand --</option>
                        {brands.map((entry) => (
                          <option key={entry.id} value={entry.name}>{entry.name}</option>
                        ))}
                        {!selectedBrandNames.has(machine.brand) && machine.brand ? (
                          <option value={machine.brand}>{machine.brand} (existing)</option>
                        ) : null}
                      </select>
                    </div>
                  </div>
                  <div className="form-row"><div className="form-cell">Original Product URL</div><div className="form-cell"><input type="url" name="productUrl" value={machine.productUrl || ""} onChange={handleChange} placeholder="https://brand-website.com/product-page" /></div></div>
                  <div className="form-row"><div className="form-cell">Description *</div><div className="form-cell"><textarea name="description" rows={4} value={machine.description} onChange={handleChange} required /></div></div>
                  <div className="form-row"><div className="form-cell">Availability</div><div className="form-cell"><select name="availability" value={machine.availability} onChange={handleChange}><option value="available">available</option><option value="out-of-stock">out-of-stock</option><option value="discontinued">discontinued</option></select></div></div>
                </div>
              </div>

              <div className="section appear delay-1">
                <div className="section-title">
                  <h3>Inquiry Contact</h3>
                  <span className="hint">At least one contact is required</span>
                </div>
                <div className="form-table">
                  <div className="form-row"><div className="form-cell">Contact Email</div><div className="form-cell"><input type="email" name="contactEmail" value={machine.contactEmail} onChange={handleChange} placeholder="sales@example.com" /></div></div>
                  <div className="form-row"><div className="form-cell">WhatsApp Number</div><div className="form-cell"><input name="whatsappNumber" value={machine.whatsappNumber} onChange={handleChange} placeholder="923001234567" /></div></div>
                  <div className="form-row"><div className="form-cell">Inquiry Only</div><div className="form-cell"><input type="checkbox" name="inquiryOnly" checked={Boolean(machine.inquiryOnly)} onChange={handleChange} /></div></div>
                  <div className="form-row"><div className="form-cell">Professional Use Only</div><div className="form-cell"><input type="checkbox" name="professionalUseOnly" checked={Boolean(machine.professionalUseOnly)} onChange={handleChange} /></div></div>
                  <div className="form-row"><div className="form-cell">Active</div><div className="form-cell"><input type="checkbox" name="isActive" checked={Boolean(machine.isActive)} onChange={handleChange} /></div></div>
                </div>
              </div>

              <div className="sticky-actions" style={{ gridColumn: "1 / -1" }}>
                <div className="actions">
                  <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Machine"}</button>
                  <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/machines")}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {imageManagerOpen && (
        <div className="image-manager-modal-overlay" role="dialog" aria-modal="true" onClick={closeImageManager}>
          <div className="image-manager-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-title">
              <h3>Select Machine Images</h3>
              <span className="hint">Select multiple images, then click Done to add URLs.</span>
            </div>

            <div className="image-input-row image-input-row-three">
              <input
                value={imageManagerQuery}
                onChange={(event) => setImageManagerQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    fetchImageManagerImages(event.currentTarget.value);
                  }
                }}
                placeholder="Search by image id or URL"
              />
              <button type="button" className="btn ghost" onClick={() => fetchImageManagerImages(imageManagerQuery)} disabled={imageManagerLoading}>
                {imageManagerLoading ? "Loading..." : "Search"}
              </button>
              <button type="button" className="btn secondary" onClick={closeImageManager}>Close</button>
            </div>

            {imageManagerError && <div className="error" style={{ marginTop: 8 }}>{imageManagerError}</div>}

            <div className="image-manager-modal-body">
              <div className="image-manager-grid">
                {imageManagerImages.map((entry, idx) => (
                  <button
                    key={`${entry.id}-${idx}`}
                    type="button"
                    className={`image-tile selectable ${selectedImageUrls[entry.url] ? "selected" : ""}`}
                    onClick={() => toggleImageSelection(entry.url)}
                  >
                    <img src={entry.url} alt={entry.publicId || `manager-image-${idx + 1}`} />
                    <span className="image-select-chip">{selectedImageUrls[entry.url] ? "Selected" : "Select"}</span>
                  </button>
                ))}
                {!imageManagerLoading && !imageManagerImages.length && (
                  <div className="image-empty">No images found in image manager.</div>
                )}
              </div>
            </div>

            <div className="image-manager-modal-footer">
              <span className="subtext">{selectedImageCount} selected</span>
              <button type="button" className="btn" onClick={addSelectedImages} disabled={!selectedImageCount}>
                {selectedImageCount
                  ? (selectedImageCount === 1 ? "Done (1 image)" : `Done (${selectedImageCount} images)`)
                  : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineForm;
