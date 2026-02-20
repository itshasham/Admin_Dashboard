import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./product.css";
import { API_BASE_URL } from '../../config/api';
import { parseApiError } from "../../utils/api-error";

const emptyProduct = {
  img: "",
  title: "",
  unit: "",
  parent: "",
  children: "",
  price: "",
  discount: 0,
  quantity: 0,
  brand: { name: "", id: "" },
  category: { name: "", id: "" },
  status: "in-stock",
  feature: false,
  featured: false,
  productType: "",
  description: "",
  imageURLs: [],
};

const normalizeRef = (value) => ({
  name: String(value?.name || "").trim(),
  id: String(value?.id || "").trim(),
});
const normalizeType = (value) => String(value || "").trim().toLowerCase();

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
    color: (typeof entry === "object" && entry?.color) || { name: "default", value: "#000000" },
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

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [product, setProduct] = useState(emptyProduct);
  const [offerStart, setOfferStart] = useState("");
  const [offerEnd, setOfferEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
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

  const toYMD = (value) => {
    if (!value) return "";
    // handle already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // try Date parsing
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    // fallback slice first 10 if looks like ISO-ish
    if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
    return "";
  };

  const toISODateStart = (ymd) => {
    if (!ymd) return undefined;
    // expect yyyy-mm-dd; convert to 00:00:00.000Z
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
    try {
      const d = new Date(`${ymd}T00:00:00.000Z`);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    } catch {
      return undefined;
    }
  };

  const digitsOnly = (val) => (typeof val === "string" ? (val.match(/\d+/g)?.join("") || "") : val);

  const mergeImages = (incomingUrls) => {
    const urls = Array.isArray(incomingUrls)
      ? incomingUrls.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    if (!urls.length) return;

    setProduct((prev) => {
      const existing = normalizeImageCollection(prev.imageURLs);
      const seen = new Set(existing.map((entry) => entry.img.toLowerCase()));
      const appended = [...existing];
      urls.forEach((url) => {
        const key = url.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const next = toImageObject(url);
        if (next) appended.push(next);
      });
      return { ...prev, imageURLs: appended };
    });
  };

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      console.log("Fetching brands from:", `${API_BASE_URL}/brand/all`);
      const resp = await fetch(`${API_BASE_URL}/brand/all`, { 
        headers: { ...getAuthHeaders() }, 
        cache: "no-store" 
      });
      
      console.log("Brands API Status:", resp.status, resp.statusText);
      
      if (resp.status === 304) { 
        console.log("304 - Not modified, using cached data");
        setLoadingBrands(false); 
        return; 
      }
      
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      
      console.log("Brands API Response:", data);
      console.log("Response headers:", Object.fromEntries(resp.headers.entries()));
      
      if (!resp.ok) {
        console.error("API Error:", resp.status, data?.message);
        throw new Error(data?.message || "Failed to load brands");
      }
      
      // Simplified extraction - try different possible structures
      let brandsArray = [];
      
      if (Array.isArray(data)) {
        brandsArray = data;
        console.log("Data is direct array");
      } else if (data && typeof data === "object") {
        // Try common property names
        const possibleArrays = [
          data.data,
          data.brands, 
          data.items,
          data.results,
          data.list,
          data.records
        ];
        
        for (const arr of possibleArrays) {
          if (Array.isArray(arr)) {
            brandsArray = arr;
            console.log("Found brands in:", Object.keys(data).find(key => data[key] === arr));
            break;
          }
        }
        
        // If still not found, look for nested arrays
        if (brandsArray.length === 0) {
          const findNestedArray = (obj, depth = 0) => {
            if (depth > 3 || !obj || typeof obj !== "object") return null;
            for (const key in obj) {
              if (Array.isArray(obj[key])) return obj[key];
              const nested = findNestedArray(obj[key], depth + 1);
              if (nested) return nested;
            }
            return null;
          };
          brandsArray = findNestedArray(data) || [];
          if (brandsArray.length > 0) {
            console.log("Found nested array");
          }
        }
      }
      
      console.log("Final brands array:", brandsArray);
      console.log("Number of brands:", brandsArray.length);
      
      if (brandsArray.length > 0) {
        console.log("First brand example:", brandsArray[0]);
      }
      
      setBrands(Array.isArray(brandsArray) ? brandsArray : []);
    } catch (err) {
      console.error("Failed to load brands:", err);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      console.log("Fetching categories from:", `${API_BASE_URL}/category/all`);
      const resp = await fetch(`${API_BASE_URL}/category/all`, { 
        headers: { ...getAuthHeaders() }, 
        cache: "no-store" 
      });
      
      console.log("Categories API Status:", resp.status, resp.statusText);
      
      if (resp.status === 304) { 
        console.log("304 - Not modified, using cached data");
        setLoadingCategories(false); 
        return; 
      }
      
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      
      console.log("Categories API Response:", data);
      
      if (!resp.ok) {
        console.error("Categories API Error:", resp.status, data?.message);
        throw new Error(data?.message || "Failed to load categories");
      }
      
      // Use the same pickArray logic as CategoryList.jsx
      const pickArray = (payload) => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.result)) return payload.result;
        if (Array.isArray(payload.data)) return payload.data;
        if (payload.data && Array.isArray(payload.data.result)) return payload.data.result;
        if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
        return [];
      };
      
      const categoriesArray = pickArray(data);
      const b2cCategories = categoriesArray.filter(
        (category) => normalizeType(category?.productType) === "beauty"
      );
      
      console.log("Final categories array:", b2cCategories);
      console.log("Number of categories:", b2cCategories.length);
      
      if (b2cCategories.length > 0) {
        console.log("First category example:", b2cCategories[0]);
      }
      
      setCategories(Array.isArray(b2cCategories) ? b2cCategories : []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      try {
        const resp = await fetch(`${API_BASE_URL}/product/single-product/${id}`, { headers: { ...getAuthHeaders() } });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || "Failed to load product");
        const payload = data?.data || data?.product || data || emptyProduct;
        const normalizedUnit = digitsOnly(payload.unit || "");
        setProduct({
          ...emptyProduct,
          ...payload,
          brand: normalizeRef(payload?.brand),
          category: normalizeRef(payload?.category),
          feature: Boolean(payload?.feature ?? payload?.featured ?? false),
          featured: Boolean(payload?.feature ?? payload?.featured ?? false),
          unit: normalizedUnit,
          imageURLs: normalizeImageCollection(payload?.imageURLs),
        });
        const start = toYMD(payload?.offerDate?.startDate) || "";
        const end = toYMD(payload?.offerDate?.endDate) || "";
        setOfferStart(start);
        setOfferEnd(end);
      } catch (err) {
        setError(err.message || "Failed to load product");
      }
    };
    load();
    fetchBrands(); // Fetch brands for dropdown
    fetchCategories(); // Fetch categories for dropdown
  }, [id, isEdit]);

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
    if (!imageManagerOpen) return;
    fetchImageManagerImages();
  }, [imageManagerOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "unit") {
      setProduct((prev) => ({ ...prev, unit: digitsOnly(value) }));
      return;
    }
    if (name === "feature" || name === "featured") {
      const nextFeature = type === "checkbox" ? checked : Boolean(value);
      setProduct((prev) => ({ ...prev, feature: nextFeature, featured: nextFeature }));
      return;
    }
    setProduct((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleNestedChange = (e, root) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [root]: {
        ...(prev[root] && typeof prev[root] === "object" ? prev[root] : {}),
        [name]: value,
      },
    }));
  };

  const handleBrandSelect = (e) => {
    const selectedBrandId = e.target.value;
    const selectedBrand = brands.find(brand => {
      const brandId = brand._id || brand.id || brand.uuid;
      return brandId === selectedBrandId;
    });
    
    console.log("Selected brand:", selectedBrand); // Debug log
    
    if (selectedBrand) {
      const brandId = selectedBrand._id || selectedBrand.id || selectedBrand.uuid || "";
      const brandName = selectedBrand.name || selectedBrand.brandName || selectedBrand.title || "";
      
      setProduct((prev) => ({
        ...prev,
        brand: {
          name: brandName,
          id: brandId
        }
      }));
    } else {
      setProduct((prev) => ({
        ...prev,
        brand: { name: "", id: "" }
      }));
    }
  };

  const handleCategorySelect = (e) => {
    const selectedCategoryId = e.target.value;
    const selectedCategory = categories.find(category => {
      const categoryId = category._id || category.id || category.uuid;
      return categoryId === selectedCategoryId;
    });
    
    console.log("Selected category:", selectedCategory); // Debug log
    
    if (selectedCategory) {
      const categoryId = selectedCategory._id || selectedCategory.id || selectedCategory.uuid || "";
      const categoryName = selectedCategory.parent || selectedCategory.name || selectedCategory.categoryName || selectedCategory.title || "";
      
      setProduct((prev) => ({
        ...prev,
        category: {
          name: categoryName,
          id: categoryId
        }
      }));
    } else {
      setProduct((prev) => ({
        ...prev,
        category: { name: "", id: "" }
      }));
    }
  };

  const handleRemoveImage = (index) => {
    setProduct(prev => ({
      ...prev,
      imageURLs: normalizeImageCollection(prev.imageURLs).filter((_, i) => i !== index),
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
      setProduct((prev) => ({ ...prev, img: safeUrl }));
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

  const prune = (obj) => {
    if (obj == null || typeof obj !== "object") return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (typeof v === "object") {
        const nested = prune(v);
        if (nested && ((Array.isArray(nested) && nested.length) || (Object.keys(nested).length))) {
          out[k] = nested;
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  const validateProduct = () => {
    const errors = [];
    
    if (!product.title?.trim()) errors.push("Title is required");
    if (!product.price || product.price <= 0) errors.push("Valid price is required");
    if (!product.brand?.name?.trim()) errors.push("Brand name is required");
    if (!product.brand?.id?.trim()) errors.push("Brand ID is required");
    if (!product.category?.name?.trim()) errors.push("Category name is required");
    if (!product.category?.id?.trim()) errors.push("Category ID is required");
    if (!product.children?.trim()) errors.push("Children field is required");
    if (!product.productType?.trim()) errors.push("Product type is required");
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setValidationIssues([]);
    
    // Validate required fields
    const localValidationErrors = validateProduct();
    if (localValidationErrors.length > 0) {
      setError("Please fix the highlighted product details before saving.");
      setValidationIssues(localValidationErrors);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    try {
      const url = isEdit ? `${API_BASE_URL}/product/edit-product/${id}` : `${API_BASE_URL}/product/add`;
      const method = isEdit ? "PATCH" : "POST";

      const payloadRaw = {
        img: product.img,
        title: product.title,
        unit: product.unit,
        parent: product.parent,
        children: product.children,
        price: product.price === "" ? undefined : Number(product.price),
        discount: product.discount === "" ? undefined : Number(product.discount),
        quantity: product.quantity === "" ? undefined : Number(product.quantity),
        brand: { name: product.brand?.name || "", id: product.brand?.id || "" },
        category: { name: product.category?.name || "", id: product.category?.id || "" },
        status: product.status,
        feature: Boolean(product.feature),
        featured: Boolean(product.feature),
        productType: product.productType,
        description: product.description,
        imageURLs: normalizeImageCollection(product.imageURLs),
      };

      const startISO = toISODateStart(offerStart);
      const endISO = toISODateStart(offerEnd);
      if (startISO && endISO) {
        payloadRaw.offerDate = { startDate: startISO, endDate: endISO };
      }

      // Don't prune required fields - ensure they're always present
      const payload = {
        ...payloadRaw,
        brand: {
          name: product.brand?.name || "",
          id: product.brand?.id || ""
        },
        category: {
          name: product.category?.name || "",
          id: product.category?.id || ""
        },
        children: product.children || "",
        imageURLs: normalizeImageCollection(product.imageURLs),
      };

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => ({})) : {};
      if (!resp.ok) {
        console.error("Product save error", { status: resp.status, data });
        const fallbackSummary =
          resp.status === 401
            ? "Your session has expired. Please log in again."
            : resp.status === 403
              ? "You do not have permission to add or edit products."
              : `Save failed (${resp.status}). Please review and try again.`;
        const parsed = parseApiError(data, fallbackSummary);
        setError(parsed.summary);
        setValidationIssues(parsed.issues);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      window.location.href = "/admin/products";
    } catch (err) {
      setError(err.message || "Save failed");
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
          <h2>{isEdit ? "Edit Product" : "New Product"}</h2>
          <p className="muted">Create product entries with confidence and clarity</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
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
      <div className="product-form-shell">
        <div className="product-side">
          <div className="card product-preview-card">
            <div className="product-preview-media">
              {product.img ? (
                <img src={product.img} alt="Product preview" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              ) : (
                <div className="preview-placeholder">No main image</div>
              )}
            </div>
            <div className="product-preview-body">
              <span className="product-preview-title">{product.title || "Untitled Product"}</span>
              <div className="product-preview-row">
                <span>Price</span>
                <strong>{product.price || "0.00"}</strong>
              </div>
              <div className="product-preview-row">
                <span>Status</span>
                <strong className="status-text">{product.status}</strong>
              </div>
              <div className="product-preview-row">
                <span>Discount</span>
                <strong>{product.discount || 0}%</strong>
              </div>
              <div className="product-preview-row">
                <span>Stock</span>
                <strong>{product.quantity || 0} units</strong>
              </div>
              <div className="product-preview-row">
                <span>Brand</span>
                <strong>{product.brand?.name || "Unassigned"}</strong>
              </div>
              <div className="product-preview-row">
                <span>Category</span>
                <strong>{product.category?.name || "Unassigned"}</strong>
              </div>
            </div>
          </div>

          <div className="card product-media-card">
            <div className="section-title">
              <h3>Media</h3>
              <span className="hint">Show the product clearly</span>
            </div>
            <label>Main Image URL</label>
            <div className="image-input-row image-main-url-row">
              <input name="img" placeholder="https://example.com/image.jpg" value={product.img} onChange={handleChange} />
              <button type="button" className="btn secondary" onClick={() => openImageManager("main")}>Select Image URL</button>
            </div>
            <div className="preview-row">
              <div className="preview">
                {product.img ? (
                  <img src={product.img} alt="Main Image Preview" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <div className="preview-placeholder">No main image</div>
                )}
              </div>
            </div>
            <label>Additional Images</label>
            <div className="actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn secondary" onClick={() => openImageManager("additional")}>Select Multiple Images</button>
              {Array.isArray(product.imageURLs) && product.imageURLs.length > 0 && (
                <button type="button" className="btn ghost" onClick={() => setProduct((prev) => ({ ...prev, imageURLs: [] }))}>Clear All</button>
              )}
            </div>
            <div className="subtext">Choose images in Image Manager, then click Done to add the URLs.</div>

            {product.imageURLs && product.imageURLs.length > 0 && (
              <div className="image-grid">
                {normalizeImageCollection(product.imageURLs).map((imageObj, index) => (
                  <div key={index} className="image-tile">
                    <img
                      src={imageObj.img}
                      alt={`Product image ${index + 1}`}
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                    <button
                      type="button"
                      className="image-remove"
                      onClick={() => handleRemoveImage(index)}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(!product.imageURLs || product.imageURLs.length === 0) && (
              <div className="image-empty">
                No additional images added yet
              </div>
            )}
          </div>
        </div>

        <div className="card compact product-form-card">
          <form onSubmit={handleSubmit} className="product-form-grid">
            <div className="section appear">
              <div className="section-title">
                <h3>Basics</h3>
                <span className="hint">Key info customers see first</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Title *<span className="subtext">Keep it short and scannable</span></div>
                  <div className="form-cell"><input name="title" placeholder="Product title" value={product.title} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Price *</div>
                  <div className="form-cell"><input name="price" type="number" step="0.01" placeholder="0.00" value={product.price} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Unit<span className="subtext">Numeric only</span></div>
                  <div className="form-cell"><input name="unit" inputMode="numeric" pattern="[0-9]*" placeholder="e.g., 3" value={product.unit} onChange={handleChange} /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Quantity</div>
                  <div className="form-cell"><input name="quantity" type="number" placeholder="0" value={product.quantity} onChange={handleChange} /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Discount</div>
                  <div className="form-cell"><input name="discount" type="number" placeholder="0" value={product.discount} onChange={handleChange} /></div>
                </div>
              </div>
            </div>

            <div className="section appear delay-1">
              <div className="section-title">
                <h3>Classification</h3>
                <span className="hint">Organize products for better discovery</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Parent</div>
                  <div className="form-cell"><input name="parent" placeholder="Parent" value={product.parent} onChange={handleChange} /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Children *</div>
                  <div className="form-cell"><input name="children" placeholder="Children" value={product.children} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Product Type *</div>
                  <div className="form-cell"><input name="productType" placeholder="grocery, electronics" value={product.productType} onChange={handleChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Status</div>
                  <div className="form-cell">
                    <div className="status-row">
                      <select name="status" value={product.status} onChange={handleChange}>
                        <option value="in-stock">in-stock</option>
                        <option value="out-of-stock">out-of-stock</option>
                        <option value="discontinued">discontinued</option>
                      </select>
                      <span className="inline-badge"><span className="dot" />{product.status}</span>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Featured Product</div>
                  <div className="form-cell">
                    <label className="inline-switch" htmlFor="feature-toggle">
                      <input
                        id="feature-toggle"
                        name="feature"
                        type="checkbox"
                        checked={Boolean(product.feature)}
                        onChange={handleChange}
                      />
                      <span>{product.feature ? "Yes - show on featured listings" : "No - keep hidden from featured listings"}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="section appear delay-2">
              <div className="section-title">
                <h3>Brand & Category</h3>
                <span className="hint">Link product to its brand and category</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Brand *</div>
                  <div className="form-cell">
                    <select
                      value={product.brand.id || ""}
                      onChange={handleBrandSelect}
                      required
                      disabled={loadingBrands}
                    >
                      <option value="">-- Select a brand --</option>
                      {brands.map((brand, index) => {
                        const brandId = brand._id || brand.id || brand.uuid || `temp_${index}`;
                        const brandName = brand.name || brand.brandName || brand.title || `Brand ${index + 1}`;
                        console.log(`Brand ${index}:`, { brandId, brandName, fullBrand: brand });
                        return (
                          <option key={brandId} value={brandId}>
                            {brandName}
                          </option>
                        );
                      })}
                    </select>
                    {loadingBrands && <span className="subtext">Loading brands...</span>}
                    {!loadingBrands && brands.length === 0 && (
                      <span className="subtext">No brands available. <a href="/admin/brands/new">Add a brand first</a></span>
                    )}
                    {!loadingBrands && brands.length > 0 && (
                      <span className="subtext">Found {brands.length} brand(s).</span>
                    )}
                  </div>
                </div>
                {product.brand?.name && (
                  <div className="form-row">
                    <div className="form-cell">Selected Brand</div>
                    <div className="form-cell">
                      <span className="inline-badge">
                        <strong>{product.brand.name}</strong> (ID: {product.brand.id})
                      </span>
                    </div>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-cell">Category *</div>
                  <div className="form-cell">
                    <select
                      value={product.category.id || ""}
                      onChange={handleCategorySelect}
                      required
                      disabled={loadingCategories}
                    >
                      <option value="">-- Select a category --</option>
                      {categories.map((category, index) => {
                        const categoryId = category._id || category.id || category.uuid || `temp_${index}`;
                        const categoryName = category.parent || category.name || category.categoryName || category.title || `Category ${index + 1}`;
                        console.log(`Category ${index}:`, { categoryId, categoryName, fullCategory: category });
                        return (
                          <option key={categoryId} value={categoryId}>
                            {categoryName}
                          </option>
                        );
                      })}
                    </select>
                    {loadingCategories && <span className="subtext">Loading categories...</span>}
                    {!loadingCategories && categories.length === 0 && (
                      <span className="subtext">No categories available. <a href="/admin/categories/new">Add a category first</a></span>
                    )}
                    {!loadingCategories && categories.length > 0 && (
                      <span className="subtext">Found {categories.length} category(ies).</span>
                    )}
                  </div>
                </div>
                {product.category?.name && (
                  <div className="form-row">
                    <div className="form-cell">Selected Category</div>
                    <div className="form-cell">
                      <span className="inline-badge">
                        <strong>{product.category.name}</strong> (ID: {product.category.id})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="section appear" style={{ gridColumn: '1 / -1' }}>
              <div className="section-title">
                <h3>Description</h3>
                <span className="hint">Highlight benefits and key features</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Description</div>
                  <div className="form-cell"><textarea name="description" placeholder="Describe the product" value={product.description} onChange={handleChange} rows={5} /></div>
                </div>
              </div>
            </div>

            <div className="section appear" style={{ gridColumn: '1 / -1' }}>
              <div className="section-title">
                <h3>Offers</h3>
                <span className="hint">Optional promotional date range</span>
              </div>
              <div className="form-table">
                <div className="form-row">
                  <div className="form-cell">Offer Start Date</div>
                  <div className="form-cell"><input type="date" value={offerStart} onChange={(e) => setOfferStart(e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-cell">Offer End Date</div>
                  <div className="form-cell"><input type="date" value={offerEnd} onChange={(e) => setOfferEnd(e.target.value)} /></div>
                </div>
              </div>
            </div>

            <div className="sticky-actions appear" style={{ gridColumn: '1 / -1' }}>
              <div className="actions">
                <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Product"}</button>
                <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/products")}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>

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

export default ProductForm;
