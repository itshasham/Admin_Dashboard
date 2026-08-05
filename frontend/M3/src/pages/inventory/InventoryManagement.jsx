import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileSpreadsheet,
  History,
  House,
  LoaderCircle,
  LockKeyhole,
  MinusCircle,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Truck,
  Warehouse,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";
import "./inventory-management.css";

const EMPTY_SUMMARY = {
  products: 0,
  medicalProducts: 0,
  clinicalProducts: 0,
  home: 0,
  office: 0,
  total: 0,
  zeroStock: 0,
};

const EMPTY_FORM = {
  kind: "",
  category: "",
  subCategory: "",
  productId: "",
  quantity: "",
  location: "home",
  note: "",
};

const EXPORT_PERIODS = [
  { value: "week", label: "Last 7 days", shortLabel: "weekly" },
  { value: "month", label: "Last 30 days", shortLabel: "monthly" },
  { value: "quarter", label: "Last 3 months", shortLabel: "three-month" },
];

const ACTIONS = {
  receive: {
    label: "Add to Home",
    eyebrow: "Stock receipt",
    description: "Record new product stock at the Home holding location.",
    submit: "Add stock to Home",
    icon: PackagePlus,
  },
  dispatch: {
    label: "Dispatch",
    eyebrow: "Warehouse transfer",
    description: "Move an available quantity from Home to the Office Warehouse.",
    submit: "Dispatch to Office",
    icon: Truck,
  },
  remove: {
    label: "Remove",
    eyebrow: "Stock correction",
    description: "Remove damaged, expired, or incorrectly counted stock with the CEO PIN.",
    submit: "Remove with secret PIN",
    icon: MinusCircle,
  },
};

const authHeaders = (json = false) => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const readJson = async (response, fallback) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = parseApiError(payload, fallback);
    throw new Error(parsed?.issues?.[0] || parsed?.summary || fallback);
  }
  return payload;
};

const number = (value) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(value) || 0);

const dateTime = (value) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const downloadFilename = (response, fallback) => {
  const disposition = response.headers.get("content-disposition") || "";
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/["']/g, ""));
  const standardMatch = disposition.match(/filename="?([^";]+)"?/i);
  return standardMatch?.[1] || fallback;
};

const unique = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const actionCopy = (movement) => {
  if (movement.action === "received_home") return "received into Home";
  if (movement.action === "dispatched_office") return "dispatched Home → Office";
  return `removed from ${movement.fromLocation === "office" ? "Office" : "Home"}`;
};

const movementTone = (action) => {
  if (action === "received_home") return "receive";
  if (action === "dispatched_office") return "dispatch";
  return "remove";
};

const InventoryManagement = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [movements, setMovements] = useState([]);
  const [movementTotal, setMovementTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeView, setActiveView] = useState("stock");
  const [action, setAction] = useState("receive");
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ search: "", kind: "", category: "" });
  const [exportPeriod, setExportPeriod] = useState("month");
  const [exporting, setExporting] = useState("");

  const loadData = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const [inventoryResponse, movementResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/inventory/movements?limit=50`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ]);
      const [inventoryPayload, movementPayload] = await Promise.all([
        readJson(inventoryResponse, "Could not load stock records"),
        readJson(movementResponse, "Could not load stock activity"),
      ]);
      setItems(Array.isArray(inventoryPayload.data) ? inventoryPayload.data : []);
      setSummary({ ...EMPTY_SUMMARY, ...(inventoryPayload.summary || {}) });
      setMovements(Array.isArray(movementPayload.data) ? movementPayload.data : []);
      setMovementTotal(Number(movementPayload.total) || 0);
      setError("");
    } catch (loadError) {
      setError(loadError?.message || "Could not load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(
    () => unique(items.map((item) => item.category)),
    [items]
  );

  const visibleItems = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.kind && item.kind !== filters.kind) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (!query) return true;
      return [item.title, item.sku, item.category, item.subCategory]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filters, items]);

  const exportableItems = useMemo(
    () => visibleItems.filter((item) => Number(item.home) > 0 || Number(item.office) > 0),
    [visibleItems]
  );

  const selectedExportPeriod = useMemo(
    () => EXPORT_PERIODS.find((period) => period.value === exportPeriod) || EXPORT_PERIODS[1],
    [exportPeriod]
  );

  const actionCategories = useMemo(
    () =>
      unique(
        items
          .filter((item) => !form.kind || item.kind === form.kind)
          .map((item) => item.category)
      ),
    [form.kind, items]
  );

  const actionSubCategories = useMemo(
    () =>
      unique(
        items
          .filter(
            (item) =>
              (!form.kind || item.kind === form.kind) &&
              (!form.category || item.category === form.category)
          )
          .map((item) => item.subCategory)
      ),
    [form.category, form.kind, items]
  );

  const actionProducts = useMemo(
    () =>
      items.filter(
        (item) =>
          (!form.kind || item.kind === form.kind) &&
          (!form.category || item.category === form.category) &&
          (!form.subCategory || item.subCategory === form.subCategory)
      ),
    [form.category, form.kind, form.subCategory, items]
  );

  const selectedProduct = useMemo(
    () => items.find((item) => item.productId === form.productId) || null,
    [form.productId, items]
  );

  const chooseAction = (nextAction, item = null) => {
    setAction(nextAction);
    setError("");
    if (!item) return;
    setForm({
      ...EMPTY_FORM,
      kind: item.kind,
      category: item.category,
      subCategory: item.subCategory,
      productId: item.productId,
      location: nextAction === "remove" && item.home === 0 && item.office > 0 ? "office" : "home",
    });
    document.getElementById("inventory-action-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const setField = (field, value) => {
    setForm((current) => {
      if (field === "kind") {
        return { ...current, kind: value, category: "", subCategory: "", productId: "" };
      }
      if (field === "category") {
        return { ...current, category: value, subCategory: "", productId: "" };
      }
      if (field === "subCategory") {
        return { ...current, subCategory: value, productId: "" };
      }
      return { ...current, [field]: value };
    });
  };

  const submitAction = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const quantity = Number(form.quantity);
    if (!form.productId) {
      setError("Select a product before recording stock.");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (action === "dispatch" && quantity > Number(selectedProduct?.home || 0)) {
      setError(`Only ${number(selectedProduct?.home)} units are available at Home.`);
      return;
    }
    if (
      action === "remove" &&
      quantity > Number(selectedProduct?.[form.location] || 0)
    ) {
      setError(
        `Only ${number(selectedProduct?.[form.location])} units are available at ${
          form.location === "home" ? "Home" : "Office"
        }.`
      );
      return;
    }

    setSaving(true);
    try {
      const endpoint =
        action === "receive"
          ? `${API_BASE_URL}/inventory/receive`
          : action === "dispatch"
            ? `${API_BASE_URL}/inventory/dispatch`
            : `${API_BASE_URL}/inventory/${form.productId}/stock`;
      const response = await fetch(endpoint, {
        method: action === "remove" ? "DELETE" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          productId: form.productId,
          quantity,
          location: form.location,
          note: form.note,
        }),
      });
      const payload = await readJson(response, "Could not update stock");
      setNotice(payload.message || "Stock record updated successfully");
      setForm((current) => ({ ...current, quantity: "", note: "" }));
      await loadData({ quiet: true });
    } catch (saveError) {
      if (saveError?.message !== "Deletion cancelled.") {
        setError(saveError?.message || "Could not update stock");
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadStockReport = async (format) => {
    if (exportableItems.length === 0 || exporting) return;
    setError("");
    setNotice("");
    setExporting(format);
    try {
      const query = new URLSearchParams({ period: exportPeriod });
      if (filters.search.trim()) query.set("search", filters.search.trim());
      if (filters.kind) query.set("kind", filters.kind);
      if (filters.category) query.set("category", filters.category);
      const response = await fetch(`${API_BASE_URL}/inventory/export/${format}?${query}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        await readJson(response, "Could not export the stock report");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("The stock report was empty. Please try again.");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadFilename(
        response,
        `nees-stock-${selectedExportPeriod.shortLabel}-${new Date().toISOString().slice(0, 10)}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      setNotice(
        `${format === "xlsx" ? "Excel" : "CSV"} stock report downloaded for ${exportableItems.length} positive-stock products.`
      );
    } catch (exportError) {
      setError(exportError?.message || "Could not export the stock report");
    } finally {
      setExporting("");
    }
  };

  const ActionIcon = ACTIONS[action].icon;

  return (
    <div className="inventory-page">
      <header className="inventory-hero">
        <div className="inventory-hero-copy">
          <span className="inventory-kicker"><ShieldCheck size={15} /> CEO stock control</span>
          <h1>Every unit, from <em>Home</em> to warehouse.</h1>
          <p>
            One controlled ledger for NEES medical and clinical products. Receive,
            dispatch, correct, and trace every movement.
          </p>
        </div>
        <div className="inventory-route-visual" aria-label="Stock flows from Home to Office Warehouse">
          <span className="route-node home"><House size={21} /><small>Home</small><strong>{number(summary.home)}</strong></span>
          <span className="route-line"><i /><Truck size={19} /></span>
          <span className="route-node office"><Warehouse size={21} /><small>Office</small><strong>{number(summary.office)}</strong></span>
        </div>
      </header>

      <section className="inventory-metrics" aria-label="Inventory summary">
        <article>
          <span className="metric-icon total"><Boxes size={19} /></span>
          <div><small>Total recorded stock</small><strong>{number(summary.total)}</strong><p>across both locations</p></div>
        </article>
        <article>
          <span className="metric-icon home"><House size={19} /></span>
          <div><small>Home holding</small><strong>{number(summary.home)}</strong><p>ready to dispatch</p></div>
        </article>
        <article>
          <span className="metric-icon office"><Warehouse size={19} /></span>
          <div><small>Office warehouse</small><strong>{number(summary.office)}</strong><p>available at office</p></div>
        </article>
        <article>
          <span className="metric-icon empty"><AlertTriangle size={19} /></span>
          <div><small>Products at zero</small><strong>{number(summary.zeroStock)}</strong><p>of {number(summary.products)} products</p></div>
        </article>
      </section>

      {(error || notice) && (
        <div className={`inventory-message ${error ? "error" : "success"}`} role="status">
          {error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{error || notice}</span>
          <button type="button" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">×</button>
        </div>
      )}

      <div className="inventory-view-tabs" role="tablist" aria-label="Stock workspace views">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "stock"}
          className={activeView === "stock" ? "active" : ""}
          onClick={() => setActiveView("stock")}
        >
          <Boxes size={17} /> Stock levels <span>{number(summary.products)}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "activity"}
          className={activeView === "activity" ? "active" : ""}
          onClick={() => setActiveView("activity")}
        >
          <History size={17} /> Movement trail <span>{number(movementTotal)}</span>
        </button>
        <button
          type="button"
          className="inventory-refresh"
          onClick={() => loadData({ quiet: true })}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} /> Refresh
        </button>
      </div>

      {activeView === "stock" ? (
        <div className="inventory-workspace">
          <section className="inventory-ledger" aria-labelledby="stock-ledger-title">
            <div className="inventory-section-head">
              <div>
                <span>Live catalog</span>
                <h2 id="stock-ledger-title">Stock ledger</h2>
                <p>Medical and clinical products begin at zero until stock is received.</p>
              </div>
              <div className="catalog-split" aria-label="Catalog mix">
                <span><Package size={14} /> {number(summary.medicalProducts)} medical</span>
                <span><Stethoscope size={14} /> {number(summary.clinicalProducts)} clinical</span>
              </div>
            </div>

            <div className="inventory-filters">
              <label className="inventory-search">
                <Search size={17} />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search product or SKU"
                  aria-label="Search stock"
                />
              </label>
              <select
                value={filters.kind}
                onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value }))}
                aria-label="Filter by product kind"
              >
                <option value="">All products</option>
                <option value="medical">Medical products</option>
                <option value="clinical">Clinical products</option>
              </select>
              <select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>

            <div className="inventory-export-bar" aria-label="Download stock report">
              <div className="inventory-export-summary">
                <span className="inventory-export-icon"><FileDown size={18} /></span>
                <span>
                  <strong>Download stock report</strong>
                  <small>
                    {number(exportableItems.length)} products with Home or Office stock above zero.
                    The file contains Product, Unit, Home Quantity, Office Quantity, and a {selectedExportPeriod.label.toLowerCase()} report label.
                  </small>
                </span>
              </div>
              <label className="inventory-export-range">
                <span>Reporting range</span>
                <select
                  value={exportPeriod}
                  onChange={(event) => setExportPeriod(event.target.value)}
                  disabled={Boolean(exporting)}
                >
                  {EXPORT_PERIODS.map((period) => (
                    <option key={period.value} value={period.value}>{period.label}</option>
                  ))}
                </select>
              </label>
              <div className="inventory-export-actions">
                <button
                  type="button"
                  onClick={() => downloadStockReport("csv")}
                  disabled={exportableItems.length === 0 || Boolean(exporting)}
                >
                  {exporting === "csv" ? <LoaderCircle className="spin" size={15} /> : <FileDown size={15} />}
                  CSV
                </button>
                <button
                  type="button"
                  className="excel"
                  onClick={() => downloadStockReport("xlsx")}
                  disabled={exportableItems.length === 0 || Boolean(exporting)}
                >
                  {exporting === "xlsx" ? <LoaderCircle className="spin" size={15} /> : <FileSpreadsheet size={15} />}
                  Excel
                </button>
              </div>
            </div>

            <div className="inventory-table-wrap">
              {loading ? (
                <div className="inventory-empty"><LoaderCircle className="spin" size={28} /><strong>Loading stock ledger…</strong></div>
              ) : visibleItems.length === 0 ? (
                <div className="inventory-empty"><Boxes size={28} /><strong>No matching products</strong><p>Clear the filters to see the full stock ledger.</p></div>
              ) : (
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Classification</th>
                      <th>Home</th>
                      <th aria-label="Transfer direction" />
                      <th>Office</th>
                      <th>Total</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.productId} className={item.total === 0 ? "zero-stock" : ""}>
                        <td data-label="Product">
                          <div className="stock-product">
                            <span className="stock-product-image">
                              {item.image ? <img src={item.image} alt="" /> : <Package size={19} />}
                            </span>
                            <span><strong>{item.title}</strong><small>{item.sku || `${item.unit} · no SKU`}</small></span>
                          </div>
                        </td>
                        <td data-label="Classification">
                          <span className={`kind-badge ${item.kind}`}>
                            {item.kind === "clinical" ? <Stethoscope size={12} /> : <Package size={12} />}
                            {item.kind}
                          </span>
                          <small className="classification-copy">{item.category} <ChevronRight size={11} /> {item.subCategory}</small>
                        </td>
                        <td data-label="Home"><strong className="stock-count home">{number(item.home)}</strong></td>
                        <td className="flow-cell" aria-label="Home to Office"><span><i /><ArrowRight size={14} /></span></td>
                        <td data-label="Office"><strong className="stock-count office">{number(item.office)}</strong></td>
                        <td data-label="Total"><strong className="stock-total">{number(item.total)}</strong><small>{item.unit}</small></td>
                        <td className="stock-row-actions">
                          <button type="button" onClick={() => chooseAction("receive", item)} title="Add stock to Home"><PackagePlus size={16} /><span>Add</span></button>
                          <button type="button" onClick={() => chooseAction("dispatch", item)} disabled={item.home === 0} title="Dispatch to Office"><Truck size={16} /><span>Send</span></button>
                          <button type="button" className="remove" onClick={() => chooseAction("remove", item)} disabled={item.total === 0} title="Remove stock"><MinusCircle size={16} /><span>Remove</span></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <aside className="inventory-action-card" id="inventory-action-panel">
            <div className="action-card-heading">
              <span className={`action-card-icon ${action}`}><ActionIcon size={21} /></span>
              <div><small>{ACTIONS[action].eyebrow}</small><h2>{ACTIONS[action].label}</h2></div>
            </div>
            <p>{ACTIONS[action].description}</p>

            <div className="action-switch" role="tablist" aria-label="Stock action">
              {Object.entries(ACTIONS).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={action === key}
                    className={action === key ? "active" : ""}
                    onClick={() => chooseAction(key)}
                  >
                    <Icon size={15} /> {meta.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={submitAction}>
              <div className="action-form-grid two">
                <label>
                  <span>Product group</span>
                  <select value={form.kind} onChange={(event) => setField("kind", event.target.value)}>
                    <option value="">All groups</option>
                    <option value="medical">Medical</option>
                    <option value="clinical">Clinical</option>
                  </select>
                </label>
                <label>
                  <span>Category</span>
                  <select value={form.category} onChange={(event) => setField("category", event.target.value)}>
                    <option value="">All categories</option>
                    {actionCategories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span>Sub-category</span>
                <select value={form.subCategory} onChange={(event) => setField("subCategory", event.target.value)}>
                  <option value="">All sub-categories</option>
                  {actionSubCategories.map((subCategory) => <option key={subCategory}>{subCategory}</option>)}
                </select>
              </label>
              <label>
                <span>Product <b>*</b></span>
                <select value={form.productId} onChange={(event) => setField("productId", event.target.value)} required>
                  <option value="">Select a product</option>
                  {actionProducts.map((product) => (
                    <option key={product.productId} value={product.productId}>{product.title}</option>
                  ))}
                </select>
              </label>

              {selectedProduct && (
                <div className="selected-stock-readout">
                  <span><House size={15} /> Home <strong>{number(selectedProduct.home)}</strong></span>
                  <ArrowRight size={14} />
                  <span><Warehouse size={15} /> Office <strong>{number(selectedProduct.office)}</strong></span>
                </div>
              )}

              {action === "remove" && (
                <fieldset className="location-choice">
                  <legend>Remove from</legend>
                  <label className={form.location === "home" ? "selected" : ""}>
                    <input type="radio" name="location" value="home" checked={form.location === "home"} onChange={(event) => setField("location", event.target.value)} />
                    <House size={16} /> Home
                  </label>
                  <label className={form.location === "office" ? "selected" : ""}>
                    <input type="radio" name="location" value="office" checked={form.location === "office"} onChange={(event) => setField("location", event.target.value)} />
                    <Warehouse size={16} /> Office
                  </label>
                </fieldset>
              )}

              <label>
                <span>Quantity <b>*</b></span>
                <div className="quantity-input">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={(event) => setField("quantity", event.target.value)}
                    placeholder="0"
                    required
                  />
                  <small>{selectedProduct?.unit || "units"}</small>
                </div>
              </label>
              <label>
                <span>Reference note <i>optional</i></span>
                <textarea
                  value={form.note}
                  onChange={(event) => setField("note", event.target.value)}
                  rows="3"
                  maxLength="500"
                  placeholder={action === "dispatch" ? "Parcel, courier, or receiving person…" : action === "remove" ? "Reason for stock correction…" : "Supplier or delivery reference…"}
                />
              </label>

              {action === "dispatch" && (
                <div className="action-rule"><Truck size={16} /><span>Quantity is subtracted from Home and added to Office in one movement.</span></div>
              )}
              {action === "remove" && (
                <div className="action-rule danger"><LockKeyhole size={16} /><span>The CEO secret delete PIN is required. The audit record remains permanent.</span></div>
              )}

              <button type="submit" className={`action-submit ${action}`} disabled={saving || loading}>
                {saving ? <LoaderCircle className="spin" size={17} /> : <ActionIcon size={17} />}
                {saving ? "Saving movement…" : ACTIONS[action].submit}
              </button>
            </form>
          </aside>
        </div>
      ) : (
        <section className="movement-panel" aria-labelledby="movement-title">
          <div className="inventory-section-head">
            <div><span>Immutable record</span><h2 id="movement-title">Movement trail</h2><p>Every receipt, dispatch, and stock correction in newest-first order.</p></div>
            <span className="audit-seal"><ShieldCheck size={17} /> CEO controlled</span>
          </div>
          {loading ? (
            <div className="inventory-empty"><LoaderCircle className="spin" size={28} /><strong>Loading movement trail…</strong></div>
          ) : movements.length === 0 ? (
            <div className="inventory-empty"><ClipboardList size={30} /><strong>No movements recorded yet</strong><p>Your first stock receipt will begin the audit trail.</p></div>
          ) : (
            <div className="movement-list">
              {movements.map((movement) => {
                const tone = movementTone(movement.action);
                const Icon = tone === "receive" ? PackagePlus : tone === "dispatch" ? Truck : MinusCircle;
                return (
                  <article key={movement._id} className={`movement-item ${tone}`}>
                    <span className="movement-icon"><Icon size={18} /></span>
                    <div className="movement-main">
                      <div><strong>{movement.productTitle}</strong><span className={`movement-badge ${tone}`}>{actionCopy(movement)}</span></div>
                      <p><b>{number(movement.quantity)}</b> units {actionCopy(movement)} by <strong>{movement.actor?.name || "CEO"}</strong></p>
                      {movement.note && <blockquote>{movement.note}</blockquote>}
                      <small>{dateTime(movement.createdAt)} · {movement.category} / {movement.subCategory}</small>
                    </div>
                    <div className="movement-balances">
                      <span><House size={14} /> Home <b>{number(movement.homeBefore)}</b><ArrowRight size={12} /><strong>{number(movement.homeAfter)}</strong></span>
                      <span><Warehouse size={14} /> Office <b>{number(movement.officeBefore)}</b><ArrowRight size={12} /><strong>{number(movement.officeAfter)}</strong></span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default InventoryManagement;
