import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";

const emptyItem = {
  img: "",
  title: "",
  parent: "Clinical",
  children: "",
  unit: "n/a",
  price: 0,
  discount: 0,
  quantity: 0,
  status: "in-stock",
  brand: { name: "", id: "" },
  category: { name: "", id: "" },
  description: "",
  imageURLs: [],
  contactEmail: "",
  whatsappNumber: "",
  inquiryOnly: true,
  isInquiryOnly: true,
  professionalUseOnly: true,
};

const CLINICAL_CATEGORY_OPTIONS = [
  { id: "111111111111111111111111", name: "Filler" },
  { id: "222222222222222222222222", name: "Booster" },
  { id: "333333333333333333333333", name: "Premium Products" },
  { id: "444444444444444444444444", name: "Thread" },
];

const normalizeClinicalCategory = (entry) => {
  const categoryId = String(entry?.id || "").trim();
  const categoryName = String(entry?.name || "").trim().toLowerCase();

  return (
    CLINICAL_CATEGORY_OPTIONS.find(
      (option) => option.id === categoryId || option.name.toLowerCase() === categoryName
    ) || null
  );
};

const pickArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.result)) return payload.data.result;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const pickCloudinaryArray = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.images)) return payload.images;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.images)) return payload.data.images;
  return [];
};

const toImageObject = (entry) => {
  const imageUrl = typeof entry === "string" ? entry : entry?.img || entry?.url || "";
  const url = String(imageUrl || "").trim();
  if (!url) return null;
  return {
    ...(typeof entry === "object" && entry ? entry : {}),
    img: url,
    color: (typeof entry === "object" && entry?.color) || { name: "default", clrCode: "" },
    sizes: (typeof entry === "object" && Array.isArray(entry?.sizes) && entry.sizes) || [],
  };
};

const normalizeImageCollection = (images) => {
  const list = Array.isArray(images) ? images : [];
  const seen = new Set();
  const normalized = [];
  list.forEach((entry) => {
    const image = toImageObject(entry);
    if (!image?.img) return;
    const key = image.img.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(image);
  });
  return normalized;
};

const ClinicalProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [item, setItem] = useState(emptyItem);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState([]);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [imageManagerTarget, setImageManagerTarget] = useState("additional");
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

  const mergeImages = (incomingUrls) => {
    const urls = Array.isArray(incomingUrls)
      ? incomingUrls.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    if (!urls.length) return;

    setItem((prev) => {
      const existing = normalizeImageCollection(prev.imageURLs);
      const seen = new Set(existing.map((entry) => entry.img.toLowerCase()));
      const appended = [...existing];
      urls.forEach((url) => {
        const key = url.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        appended.push(toImageObject(url));
      });
      return { ...prev, imageURLs: appended };
    });
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
      setBrands(pickArray(data));
    } catch {
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchItem = async () => {
    if (!isEdit) return;
    setLoading(true);
    setError("");
    try {
      let resp = await fetch(`${API_BASE_URL}/clinical-products/${id}`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      let data = await resp.json().catch(() => ({}));

      if (!resp.ok && resp.status === 404) {
        resp = await fetch(`${API_BASE_URL}/product/single-product/${id}`, {
          headers: { ...getAuthHeaders() },
          cache: "no-store",
        });
        data = await resp.json().catch(() => ({}));
      }

      if (!resp.ok) throw new Error(data?.message || "Failed to load clinical product");

      const payload = data?.data || data;
      const normalizedCategory = normalizeClinicalCategory(payload?.category);

      setItem({
        ...emptyItem,
        ...payload,
        brand: payload?.brand || { name: "", id: "" },
        category: normalizedCategory || { name: "", id: "" },
        parent: "Clinical",
        children: normalizedCategory?.name || "",
        imageURLs: normalizeImageCollection(payload?.imageURLs),
      });
    } catch (err) {
      setError(err.message || "Failed to load clinical product");
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

      const uniqueMap = new Map();
      normalized.forEach((entry) => {
        if (!uniqueMap.has(entry.url)) uniqueMap.set(entry.url, entry);
      });
      setImageManagerImages(Array.from(uniqueMap.values()));
    } catch (err) {
      setImageManagerError(err.message || "Failed to load image manager");
      setImageManagerImages([]);
    } finally {
      setImageManagerLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchItem();
  }, [id]);

  useEffect(() => {
    if (!imageManagerOpen) return;
    fetchImageManagerImages();
  }, [imageManagerOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      setItem((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleBrandSelect = (event) => {
    const selectedId = event.target.value;
    const selected = brands.find((entry) => (entry._id || entry.id || entry.uuid) === selectedId);

    const nextNode = selected
      ? {
          id: selected._id || selected.id || selected.uuid || "",
          name: selected.name || selected.parent || selected.title || "",
        }
      : { id: "", name: "" };

    setItem((prev) => ({ ...prev, brand: nextNode }));
  };

  const handleClinicalCategorySelect = (event) => {
    const selectedId = event.target.value;
    const selected = CLINICAL_CATEGORY_OPTIONS.find((entry) => entry.id === selectedId);

    if (!selected) {
      setItem((prev) => ({ ...prev, category: { id: "", name: "" }, children: "" }));
      return;
    }

    setItem((prev) => ({
      ...prev,
      category: { id: selected.id, name: selected.name },
      children: selected.name,
      parent: "Clinical",
    }));
  };

  const removeImage = (index) => {
    setItem((prev) => ({
      ...prev,
      imageURLs: normalizeImageCollection(prev.imageURLs).filter((_, idx) => idx !== index),
    }));
  };

  const openImageManager = (target = "additional") => {
    setImageManagerTarget(target === "main" ? "main" : "additional");
    setSelectedImageUrls({});
    setImageManagerError("");
    setImageManagerOpen(true);
  };

  const closeImageManager = () => {
    setImageManagerOpen(false);
    setImageManagerTarget("additional");
    setSelectedImageUrls({});
    setImageManagerError("");
    setImageManagerQuery("");
  };

  const toggleImageSelection = (url) => {
    const safeUrl = String(url || "").trim();
    if (!safeUrl) return;

    if (imageManagerTarget === "main") {
      setItem((prev) => ({ ...prev, img: safeUrl }));
      closeImageManager();
      return;
    }

    setSelectedImageUrls((prev) => ({
      ...prev,
      [safeUrl]: !prev[safeUrl],
    }));
  };

  const addSelectedImages = () => {
    if (imageManagerTarget === "main") return;
    const selectedUrls = Object.keys(selectedImageUrls).filter((url) => selectedImageUrls[url]);
    if (!selectedUrls.length) {
      setImageManagerError("Select at least one image.");
      return;
    }
    mergeImages(selectedUrls);
    closeImageManager();
  };

  const selectedImageCount = Object.keys(selectedImageUrls).filter((url) => selectedImageUrls[url]).length;
  const isSelectingMainImage = imageManagerTarget === "main";

  const validate = () => {
    const errors = [];

    if (!item.img?.trim()) errors.push("Main image URL is required");
    if (!item.title?.trim()) errors.push("Title is required");
    if (!item.description?.trim()) errors.push("Description is required");
    if (!item.brand?.id || !item.brand?.name) errors.push("Brand is required");
    if (!item.category?.id || !item.category?.name) errors.push("Category is required");
    if (!normalizeClinicalCategory(item.category)) {
      errors.push("Category must be one of Filler, Booster, Premium Products, or Thread");
    }

    if (!item.contactEmail && !item.whatsappNumber) {
      errors.push("Provide at least one contact method (Email or WhatsApp)");
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setValidationIssues([]);

    const errors = validate();
    if (errors.length) {
      setError("Please fix the highlighted clinical product details before saving.");
      setValidationIssues(errors);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const price = Number(item.price);
    const discount = Number(item.discount);
    const quantity = Number(item.quantity);

    const payload = {
      img: item.img,
      title: item.title,
      parent: "Clinical",
      children: String(item.children || item.category?.name || "").trim(),
      unit: String(item.unit || "").trim() || "n/a",
      price: Number.isFinite(price) ? price : 0,
      discount: Number.isFinite(discount) ? discount : 0,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      status: item.status || "in-stock",
      brand: item.brand,
      category: item.category,
      productType: "clinical",
      description: item.description,
      imageURLs: normalizeImageCollection(item.imageURLs),
      contactEmail: item.contactEmail || "",
      whatsappNumber: item.whatsappNumber || "",
      inquiryOnly: Boolean(item.inquiryOnly),
      isInquiryOnly: Boolean(item.isInquiryOnly),
      professionalUseOnly: Boolean(item.professionalUseOnly),
    };

    try {
      let endpoint = isEdit ? `${API_BASE_URL}/clinical-products/${id}` : `${API_BASE_URL}/clinical-products`;
      let method = isEdit ? "PUT" : "POST";
      let resp = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      let data = await resp.json().catch(() => ({}));

      if (!resp.ok && resp.status === 404) {
        endpoint = isEdit ? `${API_BASE_URL}/product/edit-product/${id}` : `${API_BASE_URL}/product/add`;
        method = isEdit ? "PATCH" : "POST";
        resp = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
        data = await resp.json().catch(() => ({}));
      }

      if (!resp.ok) {
        const fallbackSummary =
          resp.status === 401
            ? "Your session has expired. Please log in again."
            : resp.status === 403
              ? "You do not have permission to add or edit clinical products."
              : `Save failed (${resp.status}). Please review and try again.`;
        const parsed = parseApiError(data, fallbackSummary);
        setError(parsed.summary);
        setValidationIssues(parsed.issues);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      window.location.href = "/admin/clinical-products";
    } catch (err) {
      setError(err.message || "Failed to save clinical product");
      setValidationIssues([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>{isEdit ? "Edit Clinical Product" : "Add Clinical Product"}</h2>
          <p className="muted">Clinical products are displayed to customers as inquiry-first items.</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/clinical-products")}>← Back</button>
      </div>

      {loading && <div>Loading...</div>}
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

      {!loading && (
        <div className="product-form-shell">
          <div className="product-side">
            <div className="card product-preview-card">
              <div className="product-preview-media">
                {item.img ? (
                  <img src={item.img} alt="Clinical product preview" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                ) : (
                  <div className="preview-placeholder">No main image</div>
                )}
              </div>
              <div className="product-preview-body">
                <span className="product-preview-title">{item.title || "Untitled Clinical Product"}</span>
                <div className="product-preview-row">
                  <span>Brand</span>
                  <strong>{item.brand?.name || "Unassigned"}</strong>
                </div>
                <div className="product-preview-row">
                  <span>Category</span>
                  <strong>{item.category?.name || "Unassigned"}</strong>
                </div>
              </div>
            </div>

            <div className="card product-media-card">
              <div className="section-title">
                <h3>Media</h3>
                <span className="hint">Use the same image flow as products</span>
              </div>
              <label>Main Image URL *</label>
              <div className="image-input-row image-main-url-row">
                <input
                  name="img"
                  placeholder="https://example.com/image.jpg"
                  value={item.img}
                  onChange={handleChange}
                />
                <button type="button" className="btn secondary" onClick={() => openImageManager("main")}>
                  Select Image URL
                </button>
              </div>
              <div className="preview-row">
                <div className="preview">
                  {item.img ? (
                    <img src={item.img} alt="Main Image Preview" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                  ) : (
                    <div className="preview-placeholder">No main image</div>
                  )}
                </div>
              </div>

              <label>Additional Images</label>
              <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn secondary" onClick={() => openImageManager("additional")}>
                  Select Multiple Images
                </button>
                {Array.isArray(item.imageURLs) && item.imageURLs.length > 0 && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setItem((prev) => ({ ...prev, imageURLs: [] }))}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="subtext">Choose images in Image Manager, then click Done to add the URLs.</div>

              {Array.isArray(item.imageURLs) && item.imageURLs.length > 0 && (
                <div className="image-grid">
                  {normalizeImageCollection(item.imageURLs).map((image, idx) => (
                    <div className="image-tile" key={`${image?.img || "img"}-${idx}`}>
                      <img src={image?.img} alt={`clinical-${idx + 1}`} />
                      <button type="button" className="image-remove" onClick={() => removeImage(idx)}>x</button>
                    </div>
                  ))}
                </div>
              )}
              {(!Array.isArray(item.imageURLs) || item.imageURLs.length === 0) && (
                <div className="image-empty">No additional images added yet</div>
              )}
            </div>
          </div>

          <div className="card compact product-form-card">
            <form onSubmit={handleSubmit} className="product-form-grid">
              <div className="section appear">
                <div className="section-title">
                  <h3>Basics</h3>
                  <span className="hint">Core clinical product details</span>
                </div>
                <div className="form-table">
                  <div className="form-row"><div className="form-cell">Title *</div><div className="form-cell"><input name="title" value={item.title} onChange={handleChange} required /></div></div>
                  <div className="form-row"><div className="form-cell">Parent</div><div className="form-cell"><input name="parent" value={item.parent} readOnly /></div></div>
                  <div className="form-row"><div className="form-cell">Sub Category</div><div className="form-cell"><input name="children" value={item.children} readOnly placeholder="Select category below" /></div></div>
                  <div className="form-row"><div className="form-cell">Description *</div><div className="form-cell"><textarea name="description" rows={5} value={item.description} onChange={handleChange} required /></div></div>
                </div>
              </div>

              <div className="section appear delay-2" style={{ gridColumn: "1 / -1" }}>
                <div className="section-title">
                  <h3>Brand & Category</h3>
                  <span className="hint">Clinical categories are separate from B2C categories</span>
                </div>
                <div className="form-table">
                  <div className="form-row">
                    <div className="form-cell">Brand *</div>
                    <div className="form-cell">
                      <select value={item.brand.id || ""} onChange={handleBrandSelect} required disabled={loadingBrands}>
                        <option value="">-- Select brand --</option>
                        {brands.map((brand, idx) => {
                          const idKey = brand._id || brand.id || brand.uuid || `brand-${idx}`;
                          return <option key={idKey} value={idKey}>{brand.name || brand.brandName || brand.title || `Brand ${idx + 1}`}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Category *</div>
                    <div className="form-cell">
                      <select value={item.category.id || ""} onChange={handleClinicalCategorySelect} required>
                        <option value="">-- Select category --</option>
                        {CLINICAL_CATEGORY_OPTIONS.map((category) => {
                          return <option key={category.id} value={category.id}>{category.name}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section appear delay-3" style={{ gridColumn: "1 / -1" }}>
                <div className="section-title">
                  <h3>Inquiry Contact</h3>
                  <span className="hint">At least one contact method is required</span>
                </div>
                <div className="form-table">
                  <div className="form-row"><div className="form-cell">Contact Email</div><div className="form-cell"><input type="email" name="contactEmail" value={item.contactEmail} onChange={handleChange} placeholder="sales@example.com" /></div></div>
                  <div className="form-row"><div className="form-cell">WhatsApp Number</div><div className="form-cell"><input name="whatsappNumber" value={item.whatsappNumber} onChange={handleChange} placeholder="923001234567" /></div></div>
                  <div className="form-row"><div className="form-cell">Inquiry Only</div><div className="form-cell"><input type="checkbox" name="inquiryOnly" checked={Boolean(item.inquiryOnly)} onChange={handleChange} /></div></div>
                  <div className="form-row"><div className="form-cell">Professional Use Only</div><div className="form-cell"><input type="checkbox" name="professionalUseOnly" checked={Boolean(item.professionalUseOnly)} onChange={handleChange} /></div></div>
                </div>
              </div>

              <div className="sticky-actions appear" style={{ gridColumn: "1 / -1" }}>
                <div className="actions">
                  <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Clinical Product"}</button>
                  <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/clinical-products")}>Cancel</button>
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
              <h3>{isSelectingMainImage ? "Select Main Image" : "Select Additional Images"}</h3>
              <span className="hint">
                {isSelectingMainImage ? "Click one image to auto-fill Main Image URL." : "Select multiple images and add all selected URLs automatically."}
              </span>
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
                    className={`image-tile selectable ${!isSelectingMainImage && selectedImageUrls[entry.url] ? "selected" : ""}`}
                    onClick={() => toggleImageSelection(entry.url)}
                  >
                    <img src={entry.url} alt={entry.publicId || `manager-image-${idx + 1}`} />
                    <span className="image-select-chip">{isSelectingMainImage ? "Set Main" : (selectedImageUrls[entry.url] ? "Selected" : "Select")}</span>
                  </button>
                ))}
                {!imageManagerLoading && !imageManagerImages.length && (
                  <div className="image-empty">No images found in image manager.</div>
                )}
              </div>
            </div>

            {!isSelectingMainImage && (
              <div className="image-manager-modal-footer">
                <span className="subtext">{selectedImageCount} selected</span>
                <button type="button" className="btn" onClick={addSelectedImages} disabled={!selectedImageCount}>
                  {selectedImageCount
                    ? (selectedImageCount === 1 ? "Done (1 image)" : `Done (${selectedImageCount} images)`)
                    : "Done"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalProductForm;
