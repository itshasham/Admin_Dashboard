import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";

const emptyAccessory = {
  img: "",
  title: "",
  slug: "",
  unit: "pcs",
  parent: "",
  children: "",
  price: "",
  discount: 0,
  quantity: 0,
  category: { name: "", id: "" },
  status: "in-stock",
  details: "",
  description: "",
  imageURLs: [],
  videoURLs: [],
  tags: [],
  seo: {
    h1: "",
    metaTitle: "",
    metaDescription: "",
    keywords: [],
  },
  feature: false,
  featured: false,
  isActive: true,
};

const starterPresets = [
  {
    label: "Half Moon Light",
    title: "Skin Aesthetic Half Moon Light",
    parent: "Aesthetic Clinic Accessories",
    children: "Lighting",
    unit: "pcs",
    details:
      "Professional half moon LED light for skin aesthetic procedures with adjustable brightness and color temperature.",
  },
  {
    label: "3 Motor Bed",
    title: "Aesthetic 3 Motor Electric Bed",
    parent: "Aesthetic Clinic Accessories",
    children: "Beds",
    unit: "pcs",
    details:
      "Multi-position electric treatment bed with 3 motors for height, backrest, and leg rest control.",
  },
  {
    label: "Clinic Stool",
    title: "Hydraulic Clinic Stool",
    parent: "Aesthetic Clinic Accessories",
    children: "Stools",
    unit: "pcs",
    details:
      "Ergonomic clinic stool with hydraulic height control, anti-slip wheels, and easy-clean upholstery.",
  },
];

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.items)) return payload.items;
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

const uniqueStrings = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value || "").split(","))
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    )
  );

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

const normalizeVideoUrls = (videos) => {
  const list = Array.isArray(videos) ? videos : [];
  const seen = new Set();
  const out = [];

  list.forEach((entry) => {
    const url = String(typeof entry === "string" ? entry : entry?.url || entry?.video || "").trim();
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

const formatPKR = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "PKR 0.00";
  return `PKR ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const AccessoryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [accessory, setAccessory] = useState(emptyAccessory);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState([]);

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [imageManagerLoading, setImageManagerLoading] = useState(false);
  const [imageManagerError, setImageManagerError] = useState("");
  const [imageManagerQuery, setImageManagerQuery] = useState("");
  const [imageManagerImages, setImageManagerImages] = useState([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState({});

  const getAuthHeaders = useCallback(() => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, []);

  const selectedCategoryNames = useMemo(() => new Set(categories.map((entry) => entry.name)), [categories]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/category/all`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load categories");
      const normalized = pickArray(data)
        .map((entry, idx) => ({
          id: entry?._id || entry?.id || `category-${idx}`,
          name: String(entry?.name || entry?.title || "").trim(),
        }))
        .filter((entry) => entry.name);
      setCategories(normalized);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [getAuthHeaders]);

  const fetchAccessory = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    setError("");
    setValidationIssues([]);

    try {
      const resp = await fetch(`${API_BASE_URL}/accessories/${id}`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load accessory");

      const payload = data?.data || data;
      setAccessory({
        ...emptyAccessory,
        ...payload,
        price: payload?.price ?? "",
        discount: payload?.discount ?? 0,
        quantity: payload?.quantity ?? 0,
        category: {
          id: payload?.category?.id || payload?.category?._id || "",
          name: payload?.category?.name || "",
        },
        imageURLs: normalizeImageUrls(payload?.imageURLs),
        videoURLs: normalizeVideoUrls(payload?.videoURLs),
        tags: uniqueStrings(payload?.tags || []),
        seo: {
          h1: String(payload?.seo?.h1 || "").trim(),
          metaTitle: String(payload?.seo?.metaTitle || "").trim(),
          metaDescription: String(payload?.seo?.metaDescription || "").trim(),
          keywords: uniqueStrings(payload?.seo?.keywords || []),
        },
      });
    } catch (err) {
      setError(err?.message || "Failed to load accessory");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, id, isEdit]);

  const fetchImageManagerImages = useCallback(async (queryText = imageManagerQuery) => {
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
      setImageManagerError(err?.message || "Failed to load image manager");
      setImageManagerImages([]);
    } finally {
      setImageManagerLoading(false);
    }
  }, [getAuthHeaders, imageManagerQuery]);

  useEffect(() => {
    fetchCategories();
    fetchAccessory();
  }, [fetchAccessory, fetchCategories]);

  useEffect(() => {
    if (!imageManagerOpen) return;
    fetchImageManagerImages();
  }, [fetchImageManagerImages, imageManagerOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      if (name === "feature" || name === "featured") {
        setAccessory((prev) => ({
          ...prev,
          feature: checked,
          featured: checked,
        }));
        return;
      }
      setAccessory((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setAccessory((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (event) => {
    const value = String(event.target.value || "");
    const selected = categories.find((entry) => entry.name === value);
    setAccessory((prev) => ({
      ...prev,
      category: {
        id: selected?.id || "",
        name: value,
      },
    }));
  };

  const mergeImages = (urls, options = {}) => {
    const { prepend = false, replace = false } = options;
    const normalized = normalizeImageUrls(urls);
    if (!normalized.length) return;

    setAccessory((prev) => {
      const currentImages = normalizeImageUrls(prev.imageURLs || []);
      const nextImages = replace
        ? normalized
        : prepend
          ? normalizeImageUrls([...normalized, ...currentImages])
          : normalizeImageUrls([...currentImages, ...normalized]);

      return {
        ...prev,
        imageURLs: nextImages,
        img: nextImages[0] || "",
      };
    });
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

  const removeImage = (index) => {
    setAccessory((prev) => {
      const nextImages = (prev.imageURLs || []).filter((_, idx) => idx !== index);
      return {
        ...prev,
        img: nextImages[0] || "",
        imageURLs: nextImages,
      };
    });
  };

  const addVideo = () => {
    const value = String(newVideoUrl || "").trim();
    if (!value) return;
    if (!isValidHttpUrl(value)) {
      setError("Video URL must be a valid link starting with http or https.");
      return;
    }
    setAccessory((prev) => ({
      ...prev,
      videoURLs: normalizeVideoUrls([...(prev.videoURLs || []), value]),
    }));
    setNewVideoUrl("");
    setError("");
  };

  const removeVideo = (index) => {
    setAccessory((prev) => ({
      ...prev,
      videoURLs: (prev.videoURLs || []).filter((_, idx) => idx !== index),
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
    mergeImages(urls, { prepend: true });
    closeImageManager();
  };

  const applyPreset = (preset) => {
    setAccessory((prev) => ({
      ...prev,
      title: prev.title || preset.title,
      parent: prev.parent || preset.parent,
      children: prev.children || preset.children,
      unit: prev.unit || preset.unit,
      details: prev.details || preset.details,
      description: prev.description || preset.details,
    }));
  };

  const validate = () => {
    const issues = [];

    if (!String(accessory.title || "").trim()) issues.push("Title is required");
    if (!String(accessory.parent || "").trim()) issues.push("Parent category is required");
    if (!String(accessory.children || "").trim()) issues.push("Sub category is required");
    if (!String(accessory.unit || "").trim()) issues.push("Unit is required");
    if (!(Number(accessory.price) > 0)) issues.push("Valid price is required");
    if (!(Number(accessory.quantity) >= 0)) issues.push("Quantity cannot be negative");
    if (!String(accessory.details || accessory.description || "").trim()) issues.push("Details are required");

    const mainImage = String(accessory.img || "").trim();
    const firstImage = Array.isArray(accessory.imageURLs) ? accessory.imageURLs[0] : "";
    if (!mainImage && !firstImage) issues.push("At least one image URL is required");
    if (mainImage && !isValidHttpUrl(mainImage)) issues.push("Main image URL is invalid");

    (accessory.imageURLs || []).forEach((url, index) => {
      if (!isValidHttpUrl(url)) issues.push(`Image URL #${index + 1} is invalid`);
    });
    (accessory.videoURLs || []).forEach((url, index) => {
      if (!isValidHttpUrl(url)) issues.push(`Video URL #${index + 1} is invalid`);
    });

    return issues;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setValidationIssues([]);

    const issues = validate();
    if (issues.length > 0) {
      setError(`Please fix ${issues.length} field${issues.length === 1 ? "" : "s"} and try again.`);
      setValidationIssues(issues);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const images = normalizeImageUrls(accessory.imageURLs);
    const preferredMain = String(accessory.img || "").trim();
    const orderedImages = preferredMain ? normalizeImageUrls([preferredMain, ...images]) : images;
    const mainImage = orderedImages[0] || "";

    const payload = {
      img: mainImage,
      title: accessory.title,
      slug: accessory.slug || "",
      unit: accessory.unit,
      parent: accessory.parent,
      children: accessory.children,
      price: Number(accessory.price),
      discount: Math.max(0, Math.min(100, Number(accessory.discount) || 0)),
      quantity: Math.max(0, Number(accessory.quantity) || 0),
      category: {
        id: accessory.category?.id || "",
        name: accessory.category?.name || "",
      },
      status: accessory.status || "in-stock",
      details: accessory.details || accessory.description,
      description: accessory.description || accessory.details,
      imageURLs: normalizeImageUrls(orderedImages.length ? orderedImages : [mainImage]),
      videoURLs: normalizeVideoUrls(accessory.videoURLs),
      tags: uniqueStrings(accessory.tags || []),
      seo: {
        h1: accessory.seo?.h1 || "",
        metaTitle: accessory.seo?.metaTitle || "",
        metaDescription: accessory.seo?.metaDescription || "",
        keywords: uniqueStrings(accessory.seo?.keywords || []),
      },
      feature: Boolean(accessory.feature || accessory.featured),
      featured: Boolean(accessory.featured || accessory.feature),
      isActive: Boolean(accessory.isActive),
    };

    try {
      const endpoint = isEdit ? `${API_BASE_URL}/accessories/${id}` : `${API_BASE_URL}/accessories`;
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
              ? "You do not have permission to add or edit accessories."
              : `Save failed (${resp.status}). Please review and try again.`;
        const parsed = parseApiError(data, fallbackSummary);
        setError(parsed.summary);
        setValidationIssues(parsed.issues);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      window.location.href = "/admin/accessories";
    } catch (err) {
      setError(err?.message || "Failed to save accessory");
      setValidationIssues([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const price = Number(accessory.price);
  const discountPercent = Math.max(0, Math.min(100, Number(accessory.discount) || 0));
  const discountAmount = Number.isFinite(price) ? price * (discountPercent / 100) : 0;
  const finalPrice = Math.max(0, (Number.isFinite(price) ? price : 0) - discountAmount);
  const selectedImageCount = Object.keys(selectedImageUrls).filter((url) => selectedImageUrls[url]).length;
  const previewImage = String(accessory.img || "").trim() || (accessory.imageURLs || [])[0] || "";

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>{isEdit ? "Edit Accessory" : "Add Accessory"}</h2>
          <p className="muted">Dedicated accessories section with separate table and media URL support.</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/accessories")}>
          ← Back
        </button>
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
                  <img
                    src={previewImage}
                    alt="Accessory preview"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                ) : (
                  <div className="preview-placeholder">No image selected</div>
                )}
              </div>
              <div className="product-preview-body">
                <span className="product-preview-title">{accessory.title || "Untitled Accessory"}</span>
                <div className="product-preview-row">
                  <span>Category</span>
                  <strong>{accessory.parent || "General"}</strong>
                </div>
                <div className="product-preview-row">
                  <span>Sub-category</span>
                  <strong>{accessory.children || "General"}</strong>
                </div>
                <div className="product-preview-row">
                  <span>Price</span>
                  <strong>{formatPKR(finalPrice)}</strong>
                </div>
              </div>
            </div>

            <div className="card product-media-card">
              <div className="section-title">
                <h3>Image URLs</h3>
                <span className="hint">Store image links only to keep DB lightweight</span>
              </div>

              <label>Main Image URL *</label>
              <input
                type="url"
                name="img"
                placeholder="https://cdn.example.com/accessory-main.jpg"
                value={accessory.img || ""}
                onChange={handleChange}
              />

              <label style={{ marginTop: 12 }}>Additional Images</label>
              <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn secondary" onClick={openImageManager}>
                  Select from Image Manager
                </button>
                {Array.isArray(accessory.imageURLs) && accessory.imageURLs.length > 0 && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setAccessory((prev) => ({ ...prev, img: "", imageURLs: [] }))}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="image-input-row image-input-row-three" style={{ marginTop: 10 }}>
                <input
                  type="url"
                  placeholder="https://cdn.example.com/accessory-image.jpg"
                  value={newImageUrl}
                  onChange={(event) => setNewImageUrl(event.target.value)}
                />
                <button type="button" className="btn ghost" onClick={addImage}>
                  Add URL
                </button>
                <button type="button" className="btn secondary" onClick={openImageManager}>
                  Browse
                </button>
              </div>

              {Array.isArray(accessory.imageURLs) && accessory.imageURLs.length > 0 ? (
                <div className="image-grid">
                  {accessory.imageURLs.map((image, index) => (
                    <div className="image-tile" key={`${image}-${index}`}>
                      <img src={image} alt={`accessory-${index + 1}`} />
                      <button type="button" className="image-remove" onClick={() => removeImage(index)}>
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="image-empty">No additional images added yet.</div>
              )}
            </div>

            <div className="card product-media-card">
              <div className="section-title">
                <h3>Video URLs</h3>
                <span className="hint">Store links only (YouTube, Vimeo, CDN) to reduce DB load</span>
              </div>
              <div className="image-input-row image-input-row-three">
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={newVideoUrl}
                  onChange={(event) => setNewVideoUrl(event.target.value)}
                />
                <button type="button" className="btn ghost" onClick={addVideo}>
                  Add URL
                </button>
                <span className="subtext" style={{ alignSelf: "center" }}>
                  Max recommended: 10 URLs
                </span>
              </div>
              {(accessory.videoURLs || []).length > 0 ? (
                <div className="image-list">
                  {(accessory.videoURLs || []).map((videoUrl, index) => (
                    <div key={`${videoUrl}-${index}`} className="image-list-item">
                      <a href={videoUrl} target="_blank" rel="noreferrer">{videoUrl}</a>
                      <button type="button" className="btn danger" onClick={() => removeVideo(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="image-empty">No video URLs added yet.</div>
              )}
            </div>
          </div>

          <div className="card compact product-form-card">
            <form onSubmit={handleSubmit} className="product-form-grid">
              <div className="section appear">
                <div className="section-title">
                  <h3>Quick Starter Presets</h3>
                  <span className="hint">Fill common accessory templates in one click</span>
                </div>
                <div className="actions" style={{ flexWrap: "wrap" }}>
                  {starterPresets.map((preset) => (
                    <button
                      key={preset.label}
                      className="btn secondary"
                      type="button"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="section appear delay-1">
                <div className="section-title">
                  <h3>Basic Details</h3>
                  <span className="hint">Core accessory information and pricing</span>
                </div>
                <div className="form-table">
                  <div className="form-row">
                    <div className="form-cell">Title *</div>
                    <div className="form-cell">
                      <input name="title" value={accessory.title} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Slug</div>
                    <div className="form-cell">
                      <input
                        name="slug"
                        value={accessory.slug}
                        onChange={handleChange}
                        placeholder="optional-custom-slug"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Parent Category *</div>
                    <div className="form-cell">
                      <input
                        name="parent"
                        value={accessory.parent}
                        onChange={handleChange}
                        placeholder="Aesthetic Clinic Accessories"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Sub Category *</div>
                    <div className="form-cell">
                      <input
                        name="children"
                        value={accessory.children}
                        onChange={handleChange}
                        placeholder="Lighting, Beds, Stools"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Unit *</div>
                    <div className="form-cell">
                      <input name="unit" value={accessory.unit} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Price *</div>
                    <div className="form-cell">
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={accessory.price}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Discount (%)</div>
                    <div className="form-cell">
                      <input
                        name="discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={accessory.discount}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Quantity *</div>
                    <div className="form-cell">
                      <input
                        name="quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={accessory.quantity}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Status</div>
                    <div className="form-cell">
                      <select name="status" value={accessory.status} onChange={handleChange}>
                        <option value="in-stock">in-stock</option>
                        <option value="out-of-stock">out-of-stock</option>
                        <option value="discontinued">discontinued</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Discounted Price</div>
                    <div className="form-cell">
                      <strong>{formatPKR(finalPrice)}</strong>
                      <div className="subtext">
                        Discount ({discountPercent}%) = {formatPKR(discountAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section appear delay-2">
                <div className="section-title">
                  <h3>Category & Catalog Flags</h3>
                  <span className="hint">Optional classification and visibility controls</span>
                </div>
                <div className="form-table">
                  <div className="form-row">
                    <div className="form-cell">Category</div>
                    <div className="form-cell">
                      <select
                        value={accessory.category?.name || ""}
                        onChange={handleCategorySelect}
                        disabled={loadingCategories}
                      >
                        <option value="">-- Select category --</option>
                        {categories.map((entry) => (
                          <option key={entry.id} value={entry.name}>
                            {entry.name}
                          </option>
                        ))}
                        {!selectedCategoryNames.has(accessory.category?.name) && accessory.category?.name ? (
                          <option value={accessory.category.name}>{accessory.category.name} (existing)</option>
                        ) : null}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Featured</div>
                    <div className="form-cell">
                      <input
                        type="checkbox"
                        name="featured"
                        checked={Boolean(accessory.featured || accessory.feature)}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Active</div>
                    <div className="form-cell">
                      <input type="checkbox" name="isActive" checked={Boolean(accessory.isActive)} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Tags</div>
                    <div className="form-cell">
                      <input
                        value={(accessory.tags || []).join(", ")}
                        onChange={(event) =>
                          setAccessory((prev) => ({
                            ...prev,
                            tags: uniqueStrings(event.target.value),
                          }))
                        }
                        placeholder="clinic, skin, furniture"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="section appear delay-3">
                <div className="section-title">
                  <h3>Details & SEO</h3>
                  <span className="hint">Description and metadata</span>
                </div>
                <div className="form-table">
                  <div className="form-row">
                    <div className="form-cell">Details *</div>
                    <div className="form-cell">
                      <textarea
                        name="details"
                        rows={5}
                        value={accessory.details}
                        onChange={handleChange}
                        placeholder="Detailed description, specification, use case, warranty, etc."
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Description</div>
                    <div className="form-cell">
                      <textarea
                        name="description"
                        rows={3}
                        value={accessory.description}
                        onChange={handleChange}
                        placeholder="Optional short description"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">SEO H1</div>
                    <div className="form-cell">
                      <input
                        value={accessory.seo?.h1 || ""}
                        onChange={(event) =>
                          setAccessory((prev) => ({
                            ...prev,
                            seo: { ...(prev.seo || {}), h1: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Meta Title</div>
                    <div className="form-cell">
                      <input
                        value={accessory.seo?.metaTitle || ""}
                        onChange={(event) =>
                          setAccessory((prev) => ({
                            ...prev,
                            seo: { ...(prev.seo || {}), metaTitle: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">Meta Description</div>
                    <div className="form-cell">
                      <textarea
                        rows={3}
                        value={accessory.seo?.metaDescription || ""}
                        onChange={(event) =>
                          setAccessory((prev) => ({
                            ...prev,
                            seo: { ...(prev.seo || {}), metaDescription: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-cell">SEO Keywords</div>
                    <div className="form-cell">
                      <input
                        value={(accessory.seo?.keywords || []).join(", ")}
                        onChange={(event) =>
                          setAccessory((prev) => ({
                            ...prev,
                            seo: { ...(prev.seo || {}), keywords: uniqueStrings(event.target.value) },
                          }))
                        }
                        placeholder="half moon light, aesthetic bed, clinic stool"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky-actions" style={{ gridColumn: "1 / -1" }}>
                <div className="actions">
                  <button className="btn" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Accessory"}
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => (window.location.href = "/admin/accessories")}
                  >
                    Cancel
                  </button>
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
              <h3>Select Accessory Images</h3>
              <span className="hint">Select multiple images and click Done to add URLs.</span>
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
              <button
                type="button"
                className="btn ghost"
                onClick={() => fetchImageManagerImages(imageManagerQuery)}
                disabled={imageManagerLoading}
              >
                {imageManagerLoading ? "Loading..." : "Search"}
              </button>
              <button type="button" className="btn secondary" onClick={closeImageManager}>
                Close
              </button>
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
                {selectedImageCount ? `Done (${selectedImageCount})` : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessoryForm;
