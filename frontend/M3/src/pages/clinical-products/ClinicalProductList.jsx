import React, { useEffect, useState } from "react";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.products)) return payload.products;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const isClinicalProduct = (entry) => {
  const productType = String(entry?.productType || "").toLowerCase();
  const parent = String(entry?.parent || "").toLowerCase();
  return productType === "clinical" || parent === "clinical" || Boolean(entry?.inquiryOnly || entry?.isInquiryOnly);
};

const ClinicalProductList = () => {
  const [items, setItems] = useState([]);
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

  const fetchClinicalProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE_URL}/clinical-products`);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "200");
      let resp = await fetch(url.toString(), { headers: { ...getAuthHeaders() }, cache: "no-store" });
      let data = await resp.json().catch(() => null);

      if (!resp.ok && resp.status === 404) {
        resp = await fetch(`${API_BASE_URL}/product/all`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
        data = await resp.json().catch(() => null);
      }

      if (!resp.ok) throw new Error(data?.message || "Failed to load clinical products");
      const list = pickArray(data);
      setItems(resp.url.includes("/product/all") ? list.filter(isClinicalProduct) : list);
    } catch (err) {
      setItems([]);
      setError(err.message || "Failed to load clinical products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicalProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this clinical product?")) return;

    try {
      let resp = await fetch(`${API_BASE_URL}/clinical-products/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });

      let data = await resp.json().catch(() => ({}));
      if (!resp.ok && resp.status === 404) {
        resp = await fetch(`${API_BASE_URL}/product/${id}`, {
          method: "DELETE",
          headers: { ...getAuthHeaders() },
        });
        data = await resp.json().catch(() => ({}));
      }

      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchClinicalProducts();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Clinical Products</h2>
          <p className="muted">Inquiry-first products for customer view. Orders are handled via email/WhatsApp.</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => (window.location.href = "/admin/clinical-products/new")}>+ Add Clinical Product</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Contact</th>
              <th>Inquiry Mode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const id = item?._id || item?.id;
              const image = item?.img || item?.imageURLs?.[0]?.img || "";
              return (
                <tr key={id || idx}>
                  <td>
                    {image ? (
                      <img className="brand-thumb" src={image} alt={item?.title || "clinical-product"} />
                    ) : (
                      <div className="brand-thumb" style={{ visibility: "hidden" }} />
                    )}
                  </td>
                  <td>{item?.title || "-"}</td>
                  <td>{item?.category?.name || "-"}</td>
                  <td>
                    <div style={{ display: "grid", gap: 3 }}>
                      <small>{item?.contactEmail || "No email"}</small>
                      <small>{item?.whatsappNumber || "No WhatsApp"}</small>
                    </div>
                  </td>
                  <td>{item?.inquiryOnly ? "Inquiry Only" : "Standard"}</td>
                  <td>
                    <div className="actions">
                      <button className="btn" disabled={!id} onClick={() => (window.location.href = `/admin/clinical-products/${id}`)}>Edit</button>
                      <button className="btn danger" disabled={!id} onClick={() => handleDelete(id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td colSpan={6} className="muted">No clinical products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ClinicalProductList;
