import React, { useEffect, useState } from "react";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.machines)) return payload.machines;
  return [];
};

const MachineList = () => {
  const [machines, setMachines] = useState([]);
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

  const fetchMachines = async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE_URL}/machines`);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "200");
      const resp = await fetch(url.toString(), { cache: "no-store" });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load machines");
      setMachines(pickArray(data));
    } catch (err) {
      setMachines([]);
      setError(err.message || "Failed to load machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this machine?")) return;

    try {
      const resp = await fetch(`${API_BASE_URL}/machines/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchMachines();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Machines</h2>
          <p className="muted">Machine catalog for customer view and inquiry via email/WhatsApp.</p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/dashboard")}>← Back</button>
          <button className="btn" onClick={() => (window.location.href = "/admin/machines/new")}>+ Add Machine</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Model</th>
              <th>Brand</th>
              <th>Availability</th>
              <th>Contact</th>
              <th>Product URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine, idx) => {
              const id = machine?._id || machine?.id;
              const image = Array.isArray(machine?.images) ? machine.images[0] : "";
              return (
                <tr key={id || idx}>
                  <td>
                    {image ? <img className="brand-thumb" src={image} alt={machine?.name || "machine"} /> : <div className="brand-thumb" style={{ visibility: "hidden" }} />}
                  </td>
                  <td>{machine?.name || "-"}</td>
                  <td>{machine?.modelNumber || "-"}</td>
                  <td>{machine?.brand || "-"}</td>
                  <td>{machine?.availability || "-"}</td>
                  <td>
                    <div style={{ display: "grid", gap: 3 }}>
                      <small>{machine?.contactEmail || "No email"}</small>
                      <small>{machine?.whatsappNumber || "No WhatsApp"}</small>
                    </div>
                  </td>
                  <td>
                    {machine?.productUrl ? (
                      <a href={machine.productUrl} target="_blank" rel="noreferrer">Open Link</a>
                    ) : (
                      <small className="muted">No URL</small>
                    )}
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn" disabled={!id} onClick={() => (window.location.href = `/admin/machines/${id}`)}>Edit</button>
                      <button
                        className="btn secondary"
                        disabled={!machine?.productUrl}
                        onClick={() => window.open(machine.productUrl, "_blank", "noopener,noreferrer")}
                      >
                        Visit
                      </button>
                      <button className="btn danger" disabled={!id} onClick={() => handleDelete(id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!machines.length && (
              <tr>
                <td colSpan={8} className="muted">No machines found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MachineList;
