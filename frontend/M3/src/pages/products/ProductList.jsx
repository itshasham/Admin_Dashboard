import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./product.css";
import { API_BASE_URL } from "../../config/api";

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const [featureSavingIds, setFeatureSavingIds] = useState({});

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const pickArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.products)) return payload.products;
    if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    const candidates = [payload.items, payload.docs, payload.result, payload.rows, payload.list];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  };

  const normalizeCategory = (product) => {
    const raw =
      product?.category?.name ||
      product?.categoryName ||
      product?.parent ||
      product?.children ||
      "";
    const value = String(raw || "").trim();
    return value || "Uncategorized";
  };

  const normalizeProductType = (value) => String(value || "").trim().toLowerCase();
  const isClinicalProduct = (product) => normalizeProductType(product?.productType) === "clinical";

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/product/all`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store"
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(data?.message || "Failed to load products");
      const allProducts = pickArray(data);
      const b2cProducts = allProducts.filter((product) => !isClinicalProduct(product));
      setProducts(b2cProducts);
      setImageErrors({});
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Missing product id");
      return;
    }
    if (!window.confirm("Delete this product?")) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/product/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() }
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchProducts();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  const isFeatured = (product) => Boolean(product?.feature ?? product?.featured);

  const handleToggleFeatured = async (product) => {
    const id = product?._id || product?.id;
    if (!id) return;

    const nextFeature = !isFeatured(product);

    const payload = {
      ...product,
      feature: nextFeature,
      featured: nextFeature,
    };

    setFeatureSavingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const resp = await fetch(`${API_BASE_URL}/product/edit-product/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Failed to update featured status");

      setProducts((prev) =>
        prev.map((item) => {
          const itemId = item?._id || item?.id;
          if (itemId !== id) return item;
          return { ...item, feature: nextFeature, featured: nextFeature };
        })
      );
    } catch (err) {
      alert(err.message || "Failed to update featured status");
    } finally {
      setFeatureSavingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const markImageError = (id) => {
    if (!id) return;
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const formatPrice = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const categoryOptions = useMemo(() => {
    const countMap = new Map();
    products.forEach((product) => {
      const category = normalizeCategory(product);
      countMap.set(category, (countMap.get(category) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((product) => normalizeCategory(product) === selectedCategory);
  }, [products, selectedCategory]);

  const stats = useMemo(() => {
    const priced = filteredProducts
      .map((product) => Number(product?.price))
      .filter((price) => Number.isFinite(price) && price > 0);
    const total = filteredProducts.length;
    const avg = priced.length ? priced.reduce((sum, price) => sum + price, 0) / priced.length : 0;
    const highest = priced.length ? Math.max(...priced) : 0;

    return {
      total,
      avg: formatPrice(avg),
      highest: formatPrice(highest)
    };
  }, [filteredProducts]);

  useEffect(() => {
    if (selectedCategory === "all") return;
    const stillExists = categoryOptions.some((category) => category.name === selectedCategory);
    if (!stillExists) {
      setSelectedCategory("all");
    }
  }, [categoryOptions, selectedCategory]);

  if (loading) {
    return (
      <div className="page-container products-page">
        <div className="card product-list-state">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="page-container products-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Catalog</p>
          <h2>Products</h2>
          <p className="muted">Manage store products only from this page.</p>
        </div>
        <div className="header-side">
          <button className="btn secondary" onClick={() => navigate("/admin/dashboard")} type="button">
            ← Back
          </button>
          <button className="btn" onClick={() => navigate("/admin/products/new")} type="button">
            + Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="error-panel">
          <p className="error-panel-title">{error}</p>
          <div className="actions">
            <button className="btn" type="button" onClick={fetchProducts}>
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="products-summary">
        <article className="summary-card">
          <span className="summary-label">Total Products</span>
          <strong className="summary-value">{stats.total}</strong>
          <span className="summary-chip">Catalog Size</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Average Price</span>
          <strong className="summary-value">{stats.avg}</strong>
          <span className="summary-chip">Current Mix</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Highest Price</span>
          <strong className="summary-value">{stats.highest}</strong>
          <span className="summary-chip">Top Product</span>
        </article>
      </section>

      <section className="card products-filter-bar">
        <div className="products-filter-controls">
          <label htmlFor="product-category-filter">Filter by Category</label>
          <select
            id="product-category-filter"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="all">All Categories ({products.length})</option>
            {categoryOptions.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
          {selectedCategory !== "all" && (
            <button className="btn secondary" type="button" onClick={() => setSelectedCategory("all")}>
              Clear
            </button>
          )}
        </div>
        <span className="muted">
          Showing {filteredProducts.length} of {products.length} products
        </span>
      </section>

      <section className="card products-table-wrap">
        {filteredProducts.length === 0 ? (
          <div className="products-empty">
            <p>{products.length === 0 ? "No products found." : "No products found in selected category."}</p>
            <div className="actions" style={{ justifyContent: "center" }}>
              {selectedCategory !== "all" && (
                <button className="btn secondary" type="button" onClick={() => setSelectedCategory("all")}>
                  Clear Filter
                </button>
              )}
              <button className="btn" type="button" onClick={() => navigate("/admin/products/new")}>
                + Add New Product
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const id = product?._id || product?.id;
                  const image = product?.img || (Array.isArray(product?.imageURLs) && product.imageURLs[0]?.img) || "";
                  const title = product?.title || product?.name || "(no title)";
                  const categoryName = normalizeCategory(product);
                  const showImage = Boolean(image && id && !imageErrors[id]);
                  const productKey = id || index;
                  const featuredOn = isFeatured(product);
                  const featureSaving = Boolean(featureSavingIds[id]);
                  return (
                    <tr key={productKey}>
                      <td>
                        <div className="product-cell">
                          {showImage ? (
                            <img
                              className="brand-thumb product-thumb"
                              src={image}
                              alt={title}
                              loading="lazy"
                              onError={() => markImageError(id)}
                            />
                          ) : (
                            <div className="product-thumb product-thumb-placeholder" aria-hidden="true">
                              {(title.trim().charAt(0) || "P").toUpperCase()}
                            </div>
                          )}
                          <div className="product-meta">
                            <strong>{title}</strong>
                            <span>{categoryName}</span>
                            <span>{id ? `ID: ${String(id).slice(-6)}` : `Row ${index + 1}`}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="price-pill">{formatPrice(product?.price)}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`feature-toggle-btn ${featuredOn ? "on" : "off"}`}
                          aria-pressed={featuredOn}
                          disabled={!id || featureSaving}
                          onClick={() => handleToggleFeatured(product)}
                        >
                          {featureSaving ? "Saving..." : featuredOn ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td>
                        <div className="actions product-row-actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={!id}
                            onClick={() => navigate(id ? `/admin/products/${id}` : "/admin/products")}
                          >
                            Edit
                          </button>
                          <button
                            className="btn danger"
                            type="button"
                            disabled={!id}
                            onClick={() => handleDelete(id)}
                          >
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

export default ProductList;
