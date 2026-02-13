import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./order.css";
import { API_BASE_URL } from '../../config/api';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [role, setRole] = useState("");
  const courierCompanies = ["DHL", "TCS", "FedEx", "Blue Dart", "Leopards"];
  const normalizeStatus = (value) => {
    const statusValue = String(value || "").toLowerCase();
    if (statusValue === "cancelled" || statusValue === "canceled") return "cancel";
    if (statusValue === "delivered" || statusValue === "dispatched") return "dispatch";
    return statusValue || "pending";
  };

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const coerceOrder = (payload) => {
    console.log("coerceOrder input:", payload);
    
    if (!payload) {
      console.log("coerceOrder: No payload");
      return null;
    }
    
    if (payload.order) {
      console.log("coerceOrder: Found payload.order");
      return payload.order;
    }
    
    if (payload.data && !Array.isArray(payload.data)) {
      console.log("coerceOrder: Found payload.data (object)");
      return payload.data;
    }
    
    if (Array.isArray(payload.data) && payload.data.length) {
      console.log("coerceOrder: Found payload.data (array), returning first item");
      return payload.data[0];
    }
    
    if (Array.isArray(payload) && payload.length) {
      console.log("coerceOrder: Payload is array, returning first item");
      return payload[0];
    }
    
    // Handle the case where the payload might be malformed or have unusual structure
    if (typeof payload === 'object') {
      console.log("coerceOrder: Payload is object, checking for order-like structure");
      
      // Check if it has order-like fields even if _id is missing or misplaced
      const hasOrderFields = payload.name || payload.email || payload.cart || payload.totalAmount || payload.invoice;
      if (hasOrderFields) {
        console.log("coerceOrder: Found order-like fields, treating as order");
        return payload;
      }
    }
    
    console.log("coerceOrder: Returning payload as-is");
    return payload;
  };

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/orders/${id}`, { headers: { ...getAuthHeaders() }, cache: "no-store" });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => null) : null;
      
      if (!resp.ok) {
        if (resp.status === 403) throw new Error("Forbidden");
        if (resp.status === 401) throw new Error("Unauthorized");
        throw new Error(data?.message || "Failed to load order");
      }
      
      let ord = coerceOrder(data);
      
      // If the first attempt didn't work, try alternative extraction methods
      if (!ord || (!ord.name && !ord.email && !ord.cart && !ord.totalAmount && !ord.invoice)) {
        // Try different extraction strategies
        if (data && typeof data === 'object') {
          // Strategy 1: Check if data itself is the order
          if (data.name || data.email || data.cart || data.totalAmount || data.invoice) {
            ord = data;
          }
          // Strategy 2: Check for nested structures
          else if (data.result && typeof data.result === 'object') {
            ord = data.result;
          }
          // Strategy 3: Check for array with order data
          else if (Array.isArray(data) && data.length > 0) {
            ord = data[0];
          }
          // Strategy 4: Deep search for order-like object
          else {
            const findOrderInObject = (obj, depth = 0) => {
              if (depth > 3 || !obj || typeof obj !== 'object') return null;
              
              // Check if current object looks like an order
              if (obj.name || obj.email || obj.cart || obj.totalAmount || obj.invoice) {
                return obj;
              }
              
              // Recursively search nested objects
              for (const key in obj) {
                if (typeof obj[key] === 'object') {
                  const found = findOrderInObject(obj[key], depth + 1);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const foundOrder = findOrderInObject(data);
            if (foundOrder) {
              ord = foundOrder;
            }
          }
        }
      }
      
      // More lenient validation - if we have any order-like data, try to use it
      if (ord && typeof ord === 'object') {
        // Check if it has any order-like properties
        const orderFields = ['name', 'email', 'cart', 'totalAmount', 'invoice', 'status', 'address', 'contact', 'city', 'country'];
        const hasOrderFields = orderFields.some(field => ord[field] !== undefined);
        
        if (hasOrderFields) {
          setOrder(ord);
          if (ord?.status) setStatus(normalizeStatus(ord.status));
          setTrackingId(String(ord?.trackingId || ord?.trackingNumber || ""));
          setCourierCompany(String(ord?.courierCompany || ord?.courierName || ""));
          
        } else {
          // EMERGENCY FALLBACK: If all else fails, create a minimal order object
          const emergencyOrder = {
            _id: id,
            name: ord.name || ord.customerName || "Unknown Customer",
            email: ord.email || ord.customerEmail || "",
            cart: ord.cart || ord.items || [],
            totalAmount: ord.totalAmount || ord.total || 0,
            invoice: ord.invoice || ord.orderNumber || id,
            status: ord.status || "unknown",
            address: ord.address || "",
            contact: ord.contact || ord.phone || "",
            city: ord.city || "",
            country: ord.country || "",
            paymentMethod: ord.paymentMethod || "",
            createdAt: ord.createdAt || new Date().toISOString(),
            updatedAt: ord.updatedAt || new Date().toISOString()
          };
          
          setOrder(emergencyOrder);
          setStatus(normalizeStatus(emergencyOrder.status));
          setTrackingId(String(emergencyOrder?.trackingId || emergencyOrder?.trackingNumber || ""));
          setCourierCompany(String(emergencyOrder?.courierCompany || emergencyOrder?.courierName || ""));
        }
      } else {
        // EMERGENCY FALLBACK: Create minimal order from ID only
        const emergencyOrder = {
          _id: id,
          name: "Unknown Customer",
          email: "",
          cart: [],
          totalAmount: 0,
          invoice: id,
          status: "unknown",
          address: "",
          contact: "",
          city: "",
          country: "",
          paymentMethod: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setOrder(emergencyOrder);
        setStatus(normalizeStatus("unknown"));
      }
    } catch (err) {
      console.error("Failed to load order:", err);
      setError(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const nextStatus = normalizeStatus(selectedStatus);
      const sendStatus = nextStatus === "dispatch" ? "dispatched" : nextStatus;

      if (sendStatus === "dispatched") {
        if (!String(trackingId || "").trim() || !String(courierCompany || "").trim()) {
          alert("trackingId and courierCompany are required to mark an order as dispatched.");
          return;
        }
      }

      const body = {
        status: sendStatus,
        ...(sendStatus === "dispatched"
          ? { trackingId: String(trackingId).trim(), courierCompany: String(courierCompany).trim() }
          : {}),
      };

      const resp = await fetch(`${API_BASE_URL}/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => ({})) : {};
      if (!resp.ok) throw new Error(data?.message || "Failed to update order");
      await fetchOrder();
    } catch (err) {
      alert(err.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const openPrintSlip = async (format = "auto") => {
    if (!order) return;
    if (!["CEO", "Manager", "Admin"].includes(role)) {
      alert("Access denied");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const safe = (v) => String(v ?? "").trim();
    const fmtDate = (d) => { try { return d ? new Date(d).toLocaleString() : ""; } catch { return safe(d); } };

    const orderId = safe(order?._id || id);
    const items = Array.isArray(order?.cart) ? order.cart : [];
    const expectedDelivery =
      order?.expectedDeliveryDate || order?.expectedDelivery || order?.deliveryDate || "";
    const notes = order?.deliveryNotes || order?.orderNote || "";

    const rowsHtml = items
      .map((it, idx) => {
        const name = safe(it?.title || it?.name || it?.product?.title || it?.product || it?.productId || `Item ${idx + 1}`);
        const qty = it?.orderQuantity ?? it?.quantity ?? it?.qty ?? "";
        return `
          <tr>
            <td class="col-name">
              <div class="item-name">${escapeHtml(name)}</div>
            </td>
            <td class="col-qty">${escapeHtml(qty)}</td>
          </tr>
        `;
      })
      .join("");

    // QR code purpose: quick scanning of the Order ID in dispatch/warehouse.
    // Make it "workable" without external services by generating a data URL client-side.
    let qrDataUrl = "";
    try {
      const QRCode = (await import("qrcode")).default;
      qrDataUrl = await QRCode.toDataURL(orderId, {
        margin: 1,
        width: 140,
        color: { dark: "#111111", light: "#ffffff" },
      });
    } catch {
      qrDataUrl = "";
    }

    const pageCss = (() => {
      if (format === "a4") return "@page{size:A4;margin:10mm;}";
      if (format === "thermal") return "@page{size:80mm auto;margin:4mm;}";
      return "@page{size:auto;margin:10mm;}";
    })();

    const doc = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Dispatch Slip - ${escapeHtml(orderId)}</title>
          <style>
            ${pageCss}
            *{box-sizing:border-box}
            body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111;background:#fff}
            .slip{width:100%;max-width:${format === "thermal" ? "80mm" : "190mm"};margin:0 auto;padding:${format === "thermal" ? "0" : "4mm"}}
            .header{display:flex;gap:12px;align-items:center;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:10px}
            .brand{display:flex;flex-direction:column;gap:2px}
            .brand .nees{font-size:22px;font-weight:900;letter-spacing:1.5px;line-height:1}
            .brand .sub{font-size:12px;color:#444;margin-top:2px}
            .qr{width:72px;height:72px;object-fit:contain}
            .title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:10px 0 12px}
            .title h2{margin:0;font-size:16px}
            .title .oid{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
            .box{border:1px solid #ddd;border-radius:10px;padding:10px}
            .box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px}
            .row{display:flex;gap:10px;justify-content:space-between}
            .k{color:#555;font-size:12px}
            .v{font-size:12px;font-weight:600}
            .full{grid-column:1 / -1}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
            th{background:#f6f6f6;font-size:12px;text-align:left}
            td{font-size:12px}
            .col-qty{width:70px;text-align:center;font-weight:700}
            .item-name{font-weight:700}
            .totals{margin-top:10px;border-top:2px solid #111;padding-top:10px}
            .totals .row{align-items:center}
            .totals .v.big{font-size:16px}
            .notes{white-space:pre-wrap}
            .muted{color:#555;font-size:11px}
            @media print{
              body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
              .slip{max-width:none}
            }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <div class="brand">
                <div class="nees">NEES</div>
                <div class="sub">Customer Dispatch Slip</div>
              </div>
              <div style="text-align:right">
                ${qrDataUrl ? `<img class="qr" src="${escapeHtml(qrDataUrl)}" alt="Order QR" />` : `<div class="qr" style="display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:10px;font-size:11px">QR</div>`}
                <div class="muted" style="margin-top:4px">Scan: Order ID</div>
              </div>
            </div>

            <div class="title">
              <h2>Order Dispatch Slip</h2>
              <div class="oid">Order ID: ${escapeHtml(orderId)}</div>
            </div>

            <div class="grid">
              <div class="box">
                <h3>Customer</h3>
                <div class="row"><div class="k">Name</div><div class="v">${escapeHtml(order?.name || "")}</div></div>
                <div class="row"><div class="k">Contact</div><div class="v">${escapeHtml(order?.contact || order?.phoneNumber || "")}</div></div>
                <div class="row"><div class="k">Payment</div><div class="v">${escapeHtml(order?.paymentMethod || "")}</div></div>
              </div>
              <div class="box">
                <h3>Dates</h3>
                <div class="row"><div class="k">Order Date</div><div class="v">${escapeHtml(fmtDate(order?.createdAt))}</div></div>
                ${expectedDelivery ? `<div class="row"><div class="k">Expected Delivery</div><div class="v">${escapeHtml(fmtDate(expectedDelivery))}</div></div>` : `<div class="row"><div class="k">Expected Delivery</div><div class="v muted">—</div></div>`}
              </div>

              <div class="box full">
                <h3>Dispatch To</h3>
                <div class="row"><div class="k">Address</div><div class="v">${escapeHtml(order?.address || "")}</div></div>
                <div class="row"><div class="k">City / Area</div><div class="v">${escapeHtml(order?.city || "")}</div></div>
                <div class="row"><div class="k">Zip</div><div class="v">${escapeHtml(order?.zipCode || "")}</div></div>
              </div>

              <div class="box full">
                <h3>Items</h3>
                <table>
                  <thead>
                    <tr><th>Item</th><th class="col-qty">Qty</th></tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || `<tr><td colspan="2" class="muted">No items</td></tr>`}
                  </tbody>
                </table>

                <div class="totals">
                  <div class="row"><div class="k">Total Amount</div><div class="v big">${escapeHtml(order?.totalAmount ?? "")}</div></div>
                </div>
              </div>

              ${notes ? `
                <div class="box full">
                  <h3>Delivery Notes</h3>
                  <div class="notes">${escapeHtml(notes)}</div>
                </div>
              ` : ``}
            </div>

            <div class="muted" style="margin-top:10px">Printed: ${escapeHtml(fmtDate(new Date().toISOString()))}</div>
          </div>
        </body>
      </html>`;

    // Print via hidden iframe instead of a new tab (avoids about:blank / popup issues).
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "dispatch-slip");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const iwin = iframe.contentWindow;
    const idoc = iframe.contentDocument || iwin?.document;
    if (!iwin || !idoc) {
      document.body.removeChild(iframe);
      alert("Unable to open print view.");
      return;
    }

    idoc.open();
    idoc.write(doc);
    idoc.close();

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch {}
    };

    // Give the browser a moment to layout before printing, and wait for images (QR) to decode.
    setTimeout(async () => {
      try {
        const imgs = Array.from(iwin.document?.images || []);
        await Promise.all(
          imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
        );
        iwin.focus();
        iwin.print();
      } finally {
        iwin.addEventListener?.("afterprint", cleanup, { once: true });
        setTimeout(cleanup, 1500);
      }
    }, 120);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("adminData");
      const parsed = raw ? JSON.parse(raw) : null;
      setRole(String(parsed?.role || ""));
    } catch {
      setRole("");
    }
  }, []);

  if (role && !["CEO", "Manager", "Admin"].includes(role)) {
    return (
      <div className="page-container">
        <div className="error">
          <h2>Access Denied</h2>
          <p>You don't have permission to view this order.</p>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="page-container">
      <div className="loading">Loading order details...</div>
    </div>
  );
  
  if (error) return (
    <div className="page-container">
      <div className="error">
        <h2>Error Loading Order</h2>
        <p>{error}</p>
        <p>Order ID: {id}</p>
        <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
      </div>
    </div>
  );
  
  if (!order) return (
    <div className="page-container">
      <div className="error">
        <h2>Order Not Found</h2>
        <p>No order data was returned for ID: {id}</p>
        <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
      </div>
    </div>
  );

  // Additional safety check - ensure order has essential data
  if (!order || (!order.name && !order.email && !order.invoice)) {
    console.log("Order failed final safety check:", order);
    return (
      <div className="page-container">
        <div className="error">
          <h2>Invalid Order Data</h2>
          <p>Order data is missing essential fields.</p>
          <p>Order ID: {id}</p>
          <details>
            <summary>Debug Information</summary>
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </details>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
        </div>
      </div>
    );
  }

  const fmtDateTime = (d) => { try { return d ? new Date(d).toLocaleString() : ""; } catch { return d || ""; } };
  const currentStatus = normalizeStatus(order?.status || status);
  const displayStatus = normalizeStatus(status || currentStatus);
  const statusOptions = (() => {
    // Flow: pending -> processing -> dispatch, but cancel is allowed at any step.
    if (currentStatus === "pending") return ["pending", "processing", "cancel"];
    if (currentStatus === "processing") return ["processing", "dispatch", "cancel"];
    if (currentStatus === "dispatch") return ["dispatch", "cancel"];
    if (currentStatus === "cancel") return ["cancel"];
    return ["pending", "processing", "dispatch", "cancel"];
  })();
  const selectedStatus = statusOptions.includes(displayStatus) ? displayStatus : statusOptions[0];
  const canUpdate = !saving && selectedStatus !== currentStatus;
  const statusClass = displayStatus === "dispatch" ? "status-badge status-success" : displayStatus === "processing" ? "status-badge status-info" : displayStatus === "cancel" ? "status-badge status-danger" : "status-badge status-warn";

  // Wrap the entire render in a try-catch to prevent white screen
  try {
  return (
    <div className="page-container">
      <div className="order-hero">
        <div className="order-hero-meta">
          <h1>Order #{order?.invoice || id}</h1>
          <div className="meta-line">
            <span>Placed: {fmtDateTime(order?.createdAt)}</span>
            <span>Updated: {fmtDateTime(order?.updatedAt)}</span>
          </div>
        </div>
      <div className="order-hero-actions">
          <span className={statusClass}>{displayStatus}</span>
          <select className="select" value={selectedStatus} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {normalizeStatus(selectedStatus) === "dispatch" && currentStatus === "processing" && (
            <>
              <select className="select" value={courierCompany} onChange={(e) => setCourierCompany(e.target.value)}>
                <option value="">Courier Company</option>
                {courierCompanies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                className="select"
                placeholder="Tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
            </>
          )}
          <button className="btn" disabled={!canUpdate} onClick={updateStatus}>{saving ? "Saving..." : "Update"}</button>
          <button className="btn" onClick={() => openPrintSlip("a4")}>Print Slip</button>
          <button className="btn secondary" onClick={() => openPrintSlip("thermal")}>Thermal Slip</button>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back</button>
      </div>
      </div>

      <div className="grid two-col gap-16">
        <div className="card">
          <div className="card-header"><h2>Customer</h2></div>
          <div className="info-grid">
            <div><label>Name</label><p>{order?.name || ""}</p></div>
            <div><label>Email</label><p>{order?.email || ""}</p></div>
            <div><label>Contact</label><p>{order?.contact || ""}</p></div>
            <div><label>Payment</label><p>{order?.paymentMethod || ""}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Delivery</h2></div>
          <div className="info-grid">
            <div className="full"><label>Address</label><p>{order?.address || ""}</p></div>
            <div><label>City</label><p>{order?.city || ""}</p></div>
            <div><label>Country</label><p>{order?.country || ""}</p></div>
            <div><label>Zip Code</label><p>{order?.zipCode || ""}</p></div>
            <div><label>Shipping</label><p>{order?.shippingOption || ""}</p></div>
          </div>
        </div>
      </div>

      <div className="grid two-col gap-16" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-header"><h2>Amounts</h2></div>
          <div className="amounts">
            <div className="amount-item"><span className="label">Subtotal</span><span className="value">{order?.subTotal ?? 0}</span></div>
            <div className="amount-item"><span className="label">Shipping</span><span className="value">{order?.shippingCost ?? 0}</span></div>
            <div className="amount-item"><span className="label">Discount</span><span className="value">{order?.discount ?? 0}</span></div>
            <div className="amount-item total"><span className="label">Total</span><span className="value">{order?.totalAmount ?? 0}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Summary</h2></div>
          <ul className="summary-list">
            <li><span>Invoice</span><strong>{order?.invoice}</strong></li>
            <li><span>User</span><strong>{order?.user?.name || order?.user?._id || order?.user || "—"}</strong></li>
            <li><span>Items</span><strong>{(order?.cart || []).length}</strong></li>
            <li><span>Status</span><strong className={statusClass}>{displayStatus}</strong></li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h2>Items</h2></div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
              </tr>
            </thead>
            <tbody>
              {(order?.cart || []).map((item, idx) => (
                <tr key={idx}>
                  <td>
                    {item?.img ? (
                      <img className="brand-thumb" src={item.img} alt={item?.title || "item"} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                    ) : (
                      <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                    )}
                  </td>
                  <td>{item?.title || item?.product || item?.productId || "-"}</td>
                  <td>{item?.brand?.name || item?.brand || "-"}</td>
                  <td>{item?.category?.name || item?.category || "-"}</td>
                  <td>{item?.unit || "-"}</td>
                  <td>{item?.orderQuantity ?? item?.quantity ?? "-"}</td>
                  <td>{item?.price ?? "-"}</td>
                  <td>{item?.discount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  } catch (renderError) {
    console.error("Render error:", renderError);
    return (
      <div className="page-container">
        <div className="error">
          <h2>Render Error</h2>
          <p>There was an error rendering the order details.</p>
          <p>Error: {renderError.message}</p>
          <p>Order ID: {id}</p>
          <details>
            <summary>Order Data</summary>
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </details>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
        </div>
      </div>
    );
  }
};

export default OrderDetail;
