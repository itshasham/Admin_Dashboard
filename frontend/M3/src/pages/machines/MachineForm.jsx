import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";

const emptyMachine = {
  name: "",
  modelNumber: "",
  brand: "",
  description: "",
  specifications: {},
  pricing: {
    amount: "",
    currency: "USD",
    inquiryOnly: true,
    note: "",
  },
  warrantyDetails: "",
  availability: "available",
  images: [],
  contactEmail: "",
  whatsappNumber: "",
  inquiryOnly: true,
  isInquiryOnly: true,
  professionalUseOnly: true,
  isActive: true,
};

const MachineForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [machine, setMachine] = useState(emptyMachine);
  const [specJson, setSpecJson] = useState("{}");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchMachine = async () => {
    if (!isEdit) return;

    setLoading(true);
    setError("");

    try {
      const resp = await fetch(`${API_BASE_URL}/machines/${id}`, {
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load machine");

      const payload = data?.data || data;

      setMachine({
        ...emptyMachine,
        ...payload,
        pricing: {
          ...emptyMachine.pricing,
          ...(payload?.pricing || {}),
        },
        images: Array.isArray(payload?.images) ? payload.images : [],
      });

      setSpecJson(JSON.stringify(payload?.specifications || {}, null, 2));
    } catch (err) {
      setError(err.message || "Failed to load machine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachine();
  }, [id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      setMachine((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setMachine((prev) => ({ ...prev, [name]: value }));
  };

  const handlePricingChange = (event) => {
    const { name, value, type, checked } = event.target;
    setMachine((prev) => ({
      ...prev,
      pricing: {
        ...(prev.pricing || {}),
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const addImage = () => {
    const value = String(newImageUrl || "").trim();
    if (!value || !value.startsWith("http")) return;

    setMachine((prev) => ({
      ...prev,
      images: [...(prev.images || []), value],
    }));
    setNewImageUrl("");
  };

  const removeImage = (idx) => {
    setMachine((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, index) => index !== idx),
    }));
  };

  const validate = () => {
    const errors = [];

    if (!machine.name?.trim()) errors.push("Name is required");
    if (!machine.modelNumber?.trim()) errors.push("Model number is required");
    if (!machine.description?.trim()) errors.push("Description is required");

    if (machine.pricing.amount !== "" && machine.pricing.amount !== undefined) {
      const amount = Number(machine.pricing.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        errors.push("Pricing amount must be a non-negative number");
      }
    }

    if (!machine.contactEmail && !machine.whatsappNumber) {
      errors.push("Provide at least one contact method (Email or WhatsApp)");
    }

    try {
      JSON.parse(specJson || "{}");
    } catch {
      errors.push("Specifications must be valid JSON");
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const errors = validate();
    if (errors.length) {
      setError(errors.join(". "));
      setSaving(false);
      return;
    }

    let specs = {};
    try {
      specs = JSON.parse(specJson || "{}");
    } catch {
      specs = {};
    }

    const payload = {
      name: machine.name,
      modelNumber: machine.modelNumber,
      brand: machine.brand,
      description: machine.description,
      specifications: specs,
      pricing: {
        amount:
          machine.pricing.amount === "" || machine.pricing.amount === undefined
            ? undefined
            : Number(machine.pricing.amount),
        currency: machine.pricing.currency || "USD",
        inquiryOnly: Boolean(machine.pricing.inquiryOnly),
        note: machine.pricing.note || "",
      },
      warrantyDetails: machine.warrantyDetails || "",
      availability: machine.availability,
      images: Array.isArray(machine.images) ? machine.images : [],
      contactEmail: machine.contactEmail || "",
      whatsappNumber: machine.whatsappNumber || "",
      inquiryOnly: Boolean(machine.inquiryOnly),
      isInquiryOnly: Boolean(machine.isInquiryOnly),
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
      if (!resp.ok) throw new Error(data?.message || "Failed to save machine");

      window.location.href = "/admin/machines";
    } catch (err) {
      setError(err.message || "Failed to save machine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>{isEdit ? "Edit Machine" : "Add Machine"}</h2>
          <p className="muted">Machines are inquiry-first listings for customer view.</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/machines")}>← Back</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && (
        <div className="card compact product-form-card" style={{ marginTop: 16 }}>
          <form onSubmit={handleSubmit} className="product-form-grid">
            <div className="section">
              <div className="section-title"><h3>Basics</h3></div>
              <div className="form-table">
                <div className="form-row"><div className="form-cell">Name *</div><div className="form-cell"><input name="name" value={machine.name} onChange={handleChange} required /></div></div>
                <div className="form-row"><div className="form-cell">Model Number *</div><div className="form-cell"><input name="modelNumber" value={machine.modelNumber} onChange={handleChange} required /></div></div>
                <div className="form-row"><div className="form-cell">Brand</div><div className="form-cell"><input name="brand" value={machine.brand} onChange={handleChange} /></div></div>
                <div className="form-row"><div className="form-cell">Description *</div><div className="form-cell"><textarea name="description" rows={4} value={machine.description} onChange={handleChange} required /></div></div>
                <div className="form-row"><div className="form-cell">Availability</div><div className="form-cell"><select name="availability" value={machine.availability} onChange={handleChange}><option value="available">available</option><option value="out-of-stock">out-of-stock</option><option value="discontinued">discontinued</option></select></div></div>
              </div>
            </div>

            <div className="section">
              <div className="section-title"><h3>Pricing & Warranty</h3></div>
              <div className="form-table">
                <div className="form-row"><div className="form-cell">Amount</div><div className="form-cell"><input type="number" min="0" step="0.01" name="amount" value={machine.pricing.amount} onChange={handlePricingChange} /></div></div>
                <div className="form-row"><div className="form-cell">Currency</div><div className="form-cell"><input name="currency" value={machine.pricing.currency} onChange={handlePricingChange} /></div></div>
                <div className="form-row"><div className="form-cell">Pricing Note</div><div className="form-cell"><input name="note" value={machine.pricing.note} onChange={handlePricingChange} placeholder="Pricing on request" /></div></div>
                <div className="form-row"><div className="form-cell">Warranty Details</div><div className="form-cell"><textarea name="warrantyDetails" rows={3} value={machine.warrantyDetails} onChange={handleChange} /></div></div>
              </div>
            </div>

            <div className="section" style={{ gridColumn: "1 / -1" }}>
              <div className="section-title"><h3>Inquiry Contact</h3></div>
              <div className="form-table">
                <div className="form-row"><div className="form-cell">Contact Email</div><div className="form-cell"><input type="email" name="contactEmail" value={machine.contactEmail} onChange={handleChange} placeholder="sales@example.com" /></div></div>
                <div className="form-row"><div className="form-cell">WhatsApp Number</div><div className="form-cell"><input name="whatsappNumber" value={machine.whatsappNumber} onChange={handleChange} placeholder="923001234567" /></div></div>
                <div className="form-row"><div className="form-cell">Inquiry Only</div><div className="form-cell"><input type="checkbox" name="inquiryOnly" checked={Boolean(machine.inquiryOnly)} onChange={handleChange} /></div></div>
                <div className="form-row"><div className="form-cell">Professional Use Only</div><div className="form-cell"><input type="checkbox" name="professionalUseOnly" checked={Boolean(machine.professionalUseOnly)} onChange={handleChange} /></div></div>
                <div className="form-row"><div className="form-cell">Active</div><div className="form-cell"><input type="checkbox" name="isActive" checked={Boolean(machine.isActive)} onChange={handleChange} /></div></div>
              </div>
            </div>

            <div className="section" style={{ gridColumn: "1 / -1" }}>
              <div className="section-title"><h3>Specifications (JSON)</h3></div>
              <textarea rows={8} value={specJson} onChange={(event) => setSpecJson(event.target.value)} />
            </div>

            <div className="section" style={{ gridColumn: "1 / -1" }}>
              <div className="section-title"><h3>Images</h3></div>
              <div className="image-input-row three">
                <input type="url" placeholder="https://example.com/machine-image.jpg" value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} />
                <button type="button" className="btn ghost" onClick={addImage}>Add</button>
              </div>
              {machine.images?.length > 0 && (
                <div className="image-grid">
                  {machine.images.map((image, idx) => (
                    <div className="image-tile" key={`${image}-${idx}`}>
                      <img src={image} alt={`machine-${idx + 1}`} />
                      <button type="button" className="image-remove" onClick={() => removeImage(idx)}>x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky-actions" style={{ gridColumn: "1 / -1" }}>
              <div className="actions">
                <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Machine"}</button>
                <button className="btn secondary" type="button" onClick={() => (window.location.href = "/admin/machines")}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MachineForm;
