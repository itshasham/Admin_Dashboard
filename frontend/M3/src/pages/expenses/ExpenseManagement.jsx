/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eraser,
  Eye,
  FileCheck2,
  FileDown,
  Filter,
  HandCoins,
  Landmark,
  ListFilter,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";
import "./expense-management.css";

const PAYMENT_TYPES = [
  { value: "company_direct", label: "Company direct", hint: "Paid from company funds", icon: Landmark },
  { value: "employee_reimbursement", label: "Reimbursement", hint: "Employee paid personally", icon: HandCoins },
  { value: "advance", label: "Advance / petty cash", hint: "Issued before actual spend", icon: WalletCards },
];
const VIEW_ITEMS = [
  { id: "ledger", label: "Expense ledger", icon: ReceiptText },
  { id: "entry", label: "New entry", icon: Plus, writeOnly: true },
  { id: "verification", label: "Verification queue", icon: ShieldCheck },
  { id: "reports", label: "Reports", icon: TrendingUp },
  { id: "categories", label: "Categories", icon: SlidersHorizontal, managerOnly: true },
];

const localIsoDate = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const today = localIsoDate();
const startOfYear = `${today.slice(0, 4)}-01-01`;
const EMPTY_EXPENSE = {
  date: today,
  category: "",
  subCategory: "",
  description: "",
  amount: "",
  paymentType: "company_direct",
  paidByEmployee: "",
  vendorOrPayee: "",
  office: "",
  advanceAmount: "",
};
const EMPTY_FILTERS = {
  search: "",
  from: "",
  to: "",
  category: "",
  paymentType: "",
  verificationStatus: "",
  office: "",
  sort: "date_desc",
};

const readAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem("adminData") || "{}");
  } catch {
    return {};
  }
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
});

const readJson = async (response, fallback) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = parseApiError(payload, fallback);
    throw new Error(parsed?.issues?.[0] || parsed?.summary || fallback);
  }
  return payload;
};

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const shortMoney = (value) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000) return `PKR ${(amount / 1_000_000).toFixed(1)}m`;
  if (Math.abs(amount) >= 1_000) return `PKR ${(amount / 1_000).toFixed(1)}k`;
  return money(amount);
};

const dateLabel = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getId = (value) =>
  String(value?._id || value?.id || (typeof value === "string" ? value : ""));

const paymentMeta = (value) =>
  PAYMENT_TYPES.find((item) => item.value === value) || PAYMENT_TYPES[0];

const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const compressImage = async (file) => {
  if (!file?.type?.startsWith("image/") || file.size < 900_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82)
  );
  bitmap.close?.();
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
};

const SignaturePad = ({ onChange, resetKey }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    clear();
  }, [clear, resetKey]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event) => {
    event.preventDefault();
    drawing.current = true;
    const context = canvasRef.current.getContext("2d");
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3.2;
    context.strokeStyle = "#173e38";
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const move = (event) => {
    if (!drawing.current) return;
    event.preventDefault();
    const context = canvasRef.current.getContext("2d");
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
    hasInkRef.current = true;
    setHasInk(true);
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current.toBlob((blob) => {
      if (blob && hasInkRef.current) {
        onChange(new File([blob], "manager-signature.png", { type: "image/png" }));
      }
    }, "image/png");
  };

  return (
    <div className="expense-signature-pad">
      <div>
        <span><Signature size={15} /> Digital manager signature</span>
        <button type="button" onClick={clear}><Eraser size={14} /> Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width="720"
        height="220"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        aria-label="Draw manager signature"
      />
      <small>{hasInk ? "Signature captured" : "Sign inside the box using a mouse or finger"}</small>
    </div>
  );
};

const EvidenceDrop = ({ label, hint, icon: Icon, file, existing, onFile, capture }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const select = (selected) => {
    if (selected) onFile(selected);
  };
  return (
    <div
      className={`expense-dropzone ${dragging ? "dragging" : ""} ${file || existing ? "ready" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        select(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture={capture}
        onChange={(event) => select(event.target.files?.[0])}
      />
      <span className="expense-drop-icon">{file || existing ? <Check size={20} /> : <Icon size={20} />}</span>
      <div><strong>{label}</strong><small>{file?.name || (existing ? "Evidence already attached" : hint)}</small></div>
      <button type="button" onClick={() => inputRef.current?.click()}>
        {file || existing ? "Replace" : "Choose"}
      </button>
    </div>
  );
};

const Status = ({ value }) => (
  <span className={`expense-status ${String(value || "").replaceAll("_", "-")}`}>
    <i />{String(value || "pending").replaceAll("_", " ")}
  </span>
);

const ExpenseManagement = () => {
  const admin = useMemo(readAdmin, []);
  const role = admin?.role || "Admin";
  const canCreate = ["Admin", "Manager", "CEO"].includes(role);
  const canManage = ["Manager", "CEO"].includes(role);
  const isCEO = role === "CEO";
  const [activeView, setActiveView] = useState("ledger");
  const [expenses, setExpenses] = useState([]);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [reports, setReports] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [reportRange, setReportRange] = useState({ from: startOfYear, to: today, office: "" });
  const [meta, setMeta] = useState({ total: 0, filteredAmount: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expenseDraft, setExpenseDraft] = useState(EMPTY_EXPENSE);
  const [editingId, setEditingId] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureMode, setSignatureMode] = useState("draw");
  const [signatureReset, setSignatureReset] = useState(0);
  const [existingEvidence, setExistingEvidence] = useState({
    receipt: false,
    signature: false,
  });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ notes: "", via: "bank_transfer" });
  const [categoryDraft, setCategoryDraft] = useState({ name: "", subCategories: "", status: "Active" });
  const [editingCategoryId, setEditingCategoryId] = useState("");

  const fetchLookups = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/expenses/lookups`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    const payload = await readJson(response, "Could not load expense setup");
    setEmployees(payload.data.employees || []);
    setOffices(payload.data.offices || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/expense-categories`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    const payload = await readJson(response, "Could not load expense categories");
    setCategories(payload.data || []);
  }, []);

  const fetchExpenses = useCallback(async (page = 1, targetFilters = appliedFilters) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "60" });
      Object.entries(targetFilters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      const response = await fetch(`${API_BASE_URL}/expenses?${query}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const payload = await readJson(response, "Could not load office expenses");
      setExpenses(payload.data || []);
      setMeta({
        total: payload.total || 0,
        filteredAmount: payload.filteredAmount || 0,
        page: payload.page || 1,
        pages: payload.pages || 1,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  const fetchVerificationQueue = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/expenses?verificationStatus=pending&limit=200`,
        { headers: authHeaders(), cache: "no-store" }
      );
      const payload = await readJson(response, "Could not load verification queue");
      setVerificationQueue(payload.data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  const fetchReports = useCallback(async (range = reportRange) => {
    setError("");
    try {
      const query = new URLSearchParams();
      Object.entries(range).forEach(([key, value]) => value && query.set(key, value));
      const response = await fetch(
        `${API_BASE_URL}/expenses/reports/summary?${query}`,
        { headers: authHeaders(), cache: "no-store" }
      );
      const payload = await readJson(response, "Could not load expense reports");
      setReports(payload.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [reportRange]);

  useEffect(() => {
    Promise.all([
      fetchLookups(),
      fetchCategories(),
      fetchExpenses(),
      fetchReports(),
      fetchVerificationQueue(),
    ])
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [
    fetchCategories,
    fetchExpenses,
    fetchLookups,
    fetchReports,
    fetchVerificationQueue,
  ]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedCategory = categories.find(
    (category) => getId(category) === expenseDraft.category
  );
  const selectedPayment = paymentMeta(expenseDraft.paymentType);
  const pendingExpenses = verificationQueue;
  const canEditSelected =
    Boolean(selectedExpense) &&
    (canManage ||
      (role === "Admin" &&
        selectedExpense.verificationStatus === "pending" &&
        getId(selectedExpense.createdBy) === getId(admin)));

  const resetEntry = () => {
    setExpenseDraft(EMPTY_EXPENSE);
    setEditingId("");
    setReceiptFile(null);
    setSignatureFile(null);
    setSignatureMode("draw");
    setSignatureReset((value) => value + 1);
    setExistingEvidence({ receipt: false, signature: false });
  };

  const uploadEvidence = async (kind, file) => {
    const processed = await compressImage(file);
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", processed);
    const response = await fetch(`${API_BASE_URL}/expenses/documents`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    return (await readJson(response, `Could not upload ${kind}`)).data;
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const evidence = {};
      if (receiptFile) evidence.receipt = await uploadEvidence("receipt", receiptFile);
      if (signatureFile) evidence.signature = await uploadEvidence("signature", signatureFile);
      const response = await fetch(
        `${API_BASE_URL}/expenses${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ...expenseDraft, ...evidence }),
        }
      );
      const payload = await readJson(response, "Could not save expense");
      setNotice(payload.message || "Expense saved");
      resetEntry();
      setActiveView(editingId ? "verification" : "ledger");
      await Promise.all([fetchExpenses(1), fetchReports(), fetchVerificationQueue()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const editExpense = (expense) => {
    setExpenseDraft({
      date: new Date(expense.date).toISOString().slice(0, 10),
      category: getId(expense.category),
      subCategory: expense.subCategory || "",
      description: expense.description || "",
      amount: expense.amount || "",
      paymentType: expense.paymentType,
      paidByEmployee: getId(expense.paidByEmployee),
      vendorOrPayee: expense.vendorOrPayee || "",
      office: getId(expense.office),
      advanceAmount: expense.advanceAmount || "",
    });
    setEditingId(getId(expense));
    setReceiptFile(null);
    setSignatureFile(null);
    setExistingEvidence({
      receipt: Boolean(expense.receipt?.available),
      signature: Boolean(expense.signature?.available),
    });
    setActiveView("entry");
    setSelectedExpense(null);
  };

  const loadExpense = async (id) => {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        headers: authHeaders(),
      });
      const payload = await readJson(response, "Could not load expense details");
      setSelectedExpense(payload.data);
      setReviewDraft({ notes: payload.data.verificationNotes || "", via: "bank_transfer" });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const expenseAction = async (endpoint, body, success) => {
    if (!selectedExpense) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/expenses/${getId(selectedExpense)}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        }
      );
      const payload = await readJson(response, success);
      setNotice(payload.message || success);
      setSelectedExpense(payload.data || null);
      await Promise.all([
        fetchExpenses(meta.page),
        fetchReports(),
        fetchVerificationQueue(),
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const viewEvidence = async (expense, kind) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/expenses/${getId(expense)}/documents/${kind}/access`,
        { headers: authHeaders() }
      );
      const payload = await readJson(response, `Could not open ${kind}`);
      window.open(payload.data.url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteExpense = async (expense) => {
    if (!isCEO) return;
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${getId(expense)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const payload = await readJson(response, "Could not delete expense");
      setNotice(payload.message);
      setSelectedExpense(null);
      await Promise.all([fetchExpenses(1), fetchReports(), fetchVerificationQueue()]);
    } catch (requestError) {
      if (requestError.message !== "Deletion cancelled.") setError(requestError.message);
    }
  };

  const exportLedger = async (format) => {
    setError("");
    try {
      const query = new URLSearchParams({ format });
      Object.entries(appliedFilters).forEach(([key, value]) => value && query.set(key, value));
      const response = await fetch(`${API_BASE_URL}/expenses/export?${query}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        await readJson(response, "Could not export expenses");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `office-expenses-${today}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/expense-categories${editingCategoryId ? `/${editingCategoryId}` : ""}`,
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            ...categoryDraft,
            subCategories: categoryDraft.subCategories
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        }
      );
      const payload = await readJson(response, "Could not save category");
      setNotice(payload.message);
      setCategoryDraft({ name: "", subCategories: "", status: "Active" });
      setEditingCategoryId("");
      await Promise.all([fetchLookups(), fetchCategories()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    fetchExpenses(1, filters);
  };

  const activeCategories = categories.filter((category) => category.status === "Active");
  const reportOverview = reports?.overview || {};
  const maxCategoryTotal = Math.max(
    ...(reports?.byCategory || []).map((item) => Number(item.total) || 0),
    1
  );

  return (
    <div className="expense-page">
      <section className="expense-hero">
        <div className="expense-hero-copy">
          <p><Sparkles size={14} /> Office finance control</p>
          <h1>Every rupee.<br /><em>Accounted for.</em></h1>
          <span>Receipts, reimbursements and petty cash—captured at the moment of spend and verified in one auditable ledger.</span>
        </div>
        <div className="expense-hero-actions">
          <button type="button" className="expense-button quiet" onClick={() => Promise.all([fetchExpenses(meta.page), fetchReports()])}>
            <RefreshCw size={16} /> Refresh
          </button>
          {canCreate && (
            <button type="button" className="expense-button bright" onClick={() => { resetEntry(); setActiveView("entry"); }}>
              <Plus size={17} /> Record expense
            </button>
          )}
        </div>
        <div className="expense-hero-stamp">
          <span>{new Date().toLocaleDateString("en-PK", { month: "short" }).toUpperCase()}</span>
          <strong>{String(new Date().getDate()).padStart(2, "0")}</strong>
          <small>{role} view</small>
        </div>
      </section>

      <section className="expense-kpis" aria-label="Expense summary">
        <article><span><CircleDollarSign size={18} /></span><div><small>Filtered spend</small><strong>{shortMoney(meta.filteredAmount)}</strong><p>{meta.total} ledger entries</p></div></article>
        <article><span><Clock3 size={18} /></span><div><small>Awaiting verification</small><strong>{reportOverview.pendingVerification || 0}</strong><p>Receipt review queue</p></div></article>
        <article><span><HandCoins size={18} /></span><div><small>Owed to employees</small><strong>{shortMoney(reportOverview.outstandingReimbursements)}</strong><p>{reportOverview.outstandingReimbursementCount || 0} liabilities</p></div></article>
        <article className={Number(reportOverview.advanceVariance) > 0 ? "risk" : ""}><span><WalletCards size={18} /></span><div><small>Advance variance</small><strong>{shortMoney(reportOverview.advanceVariance)}</strong><p>{reportOverview.openAdvances || 0} open advances</p></div></article>
      </section>

      <nav className="expense-view-tabs" aria-label="Expense workspace">
        {VIEW_ITEMS.filter((item) => (!item.writeOnly || canCreate) && (!item.managerOnly || canManage)).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={activeView === id ? "active" : ""} onClick={() => { setActiveView(id); if (id === "entry" && !editingId) resetEntry(); }}>
            <Icon size={16} />{label}
            {id === "verification" && <i>{reportOverview.pendingVerification || pendingExpenses.length}</i>}
          </button>
        ))}
      </nav>

      {error && <div className="expense-message error" role="alert"><AlertCircle size={18} /><span>{error}</span><button type="button" onClick={() => setError("")}><X size={16} /></button></div>}
      {notice && <div className="expense-message success" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><X size={16} /></button></div>}

      {activeView === "ledger" && (
        <section className="expense-ledger">
          <header className="expense-section-head">
            <div><p>Master ledger</p><h2>Office spending</h2><span>Search, filter, and export the same controlled accounting view.</span></div>
            <div className="expense-export-actions">
              <button type="button" onClick={() => exportLedger("csv")}><FileDown size={15} /> CSV</button>
              <button type="button" onClick={() => exportLedger("xls")}><Download size={15} /> Excel</button>
            </div>
          </header>
          <div className="expense-filter-bar">
            <label className="expense-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Vendor, employee, expense no…" /></label>
            <label><span>From</span><input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
            <label><span>To</span><input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
            <select aria-label="Category filter" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{categories.map((category) => <option key={getId(category)} value={getId(category)}>{category.name}</option>)}</select>
            <select aria-label="Payment type filter" value={filters.paymentType} onChange={(event) => setFilters((current) => ({ ...current, paymentType: event.target.value }))}><option value="">All payments</option>{PAYMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Verification filter" value={filters.verificationStatus} onChange={(event) => setFilters((current) => ({ ...current, verificationStatus: event.target.value }))}><option value="">All verification</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
            <select aria-label="Office filter" value={filters.office} onChange={(event) => setFilters((current) => ({ ...current, office: event.target.value }))}><option value="">All offices</option>{offices.map((office) => <option key={getId(office)} value={getId(office)}>{office.code} · {office.city}</option>)}</select>
            <select aria-label="Sort expenses" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}><option value="date_desc">Newest date</option><option value="date_asc">Oldest date</option><option value="amount_desc">Highest amount</option><option value="amount_asc">Lowest amount</option></select>
            <button type="button" className="expense-filter-apply" onClick={applyFilters}><Filter size={15} /> Apply</button>
          </div>
          <div className="expense-table-wrap">
            <table className="expense-table">
              <thead><tr><th>Reference</th><th>Spend</th><th>Paid through</th><th>Employee / office</th><th>Evidence</th><th>Status</th><th /></tr></thead>
              <tbody>
                {!loading && expenses.map((expense) => {
                  const PaymentIcon = paymentMeta(expense.paymentType).icon;
                  return (
                    <tr key={getId(expense)}>
                      <td><button type="button" className="expense-reference" onClick={() => loadExpense(getId(expense))}><strong>{expense.expenseNumber}</strong><span>{dateLabel(expense.date)}</span></button></td>
                      <td><strong className="expense-amount">{money(expense.amount)}</strong><span>{expense.categorySnapshot}{expense.subCategory ? ` · ${expense.subCategory}` : ""}</span><small>{expense.vendorOrPayee}</small></td>
                      <td><span className="expense-payment"><PaymentIcon size={15} />{paymentMeta(expense.paymentType).label}</span></td>
                      <td>{expense.paidByEmployee ? <span className="expense-person"><i>{initials(expense.paidByEmployee.fullName)}</i><span><strong>{expense.paidByEmployee.fullName}</strong><small>{expense.paidByEmployee.employeeCode}</small></span></span> : <span className="expense-office"><Building2 size={15} />{expense.office?.code || "Company"}</span>}</td>
                      <td><span className="expense-evidence"><i className={expense.receipt?.available ? "ready" : ""}>R</i><i className={expense.signature?.available ? "ready" : ""}>S</i></span></td>
                      <td><Status value={expense.verificationStatus} />{expense.reimbursementStatus && <small className="expense-substatus">{expense.reimbursementStatus}</small>}</td>
                      <td><button type="button" className="expense-row-open" aria-label={`Open ${expense.expenseNumber}`} onClick={() => loadExpense(getId(expense))}><ChevronRight size={17} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <div className="expense-empty"><LoaderCircle className="spin" size={26} /><strong>Balancing the ledger…</strong></div>}
            {!loading && !expenses.length && <div className="expense-empty"><ReceiptText size={28} /><strong>No expenses match these filters</strong><p>Clear the filters or record the first office expense.</p></div>}
          </div>
          {meta.pages > 1 && <footer className="expense-pagination"><button type="button" disabled={meta.page <= 1} onClick={() => fetchExpenses(meta.page - 1)}><ChevronLeft size={15} /> Previous</button><span>Page {meta.page} of {meta.pages}</span><button type="button" disabled={meta.page >= meta.pages} onClick={() => fetchExpenses(meta.page + 1)}>Next <ChevronRight size={15} /></button></footer>}
        </section>
      )}

      {activeView === "entry" && canCreate && (
        <section className="expense-entry-layout">
          <form className="expense-entry-card" onSubmit={saveExpense}>
            <header className="expense-section-head compact"><div><p>{editingId ? "Manager correction" : "New ledger entry"}</p><h2>{editingId ? "Update expense evidence" : "Record an office expense"}</h2><span>{editingId ? "Saving changes returns the record to verification." : "Capture the spend now; a manager can complete verification later."}</span></div>{editingId && <button type="button" className="expense-link-button" onClick={() => { resetEntry(); setActiveView("ledger"); }}><X size={15} /> Cancel edit</button>}</header>
            <div className="expense-form-section">
              <div className="expense-form-label"><span>01</span><div><strong>Transaction</strong><small>When, where, and how much</small></div></div>
              <div className="expense-form-grid">
                <Field label="Expense date *"><input required type="date" value={expenseDraft.date} onChange={(event) => setExpenseDraft((current) => ({ ...current, date: event.target.value }))} /></Field>
                <Field label="Amount (PKR) *"><input required type="number" min="0.01" step="0.01" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0" /></Field>
                <Field label="Category *"><select required value={expenseDraft.category} onChange={(event) => setExpenseDraft((current) => ({ ...current, category: event.target.value, subCategory: "" }))}><option value="">Choose category…</option>{activeCategories.map((category) => <option key={getId(category)} value={getId(category)}>{category.name}</option>)}</select></Field>
                <Field label="Sub-category"><select value={expenseDraft.subCategory} onChange={(event) => setExpenseDraft((current) => ({ ...current, subCategory: event.target.value }))}><option value="">Choose sub-category…</option>{(selectedCategory?.subCategories || []).map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Vendor or payee *"><input required value={expenseDraft.vendorOrPayee} onChange={(event) => setExpenseDraft((current) => ({ ...current, vendorOrPayee: event.target.value }))} placeholder="Shop, utility, rider, or supplier" /></Field>
                <Field label="Office"><select value={expenseDraft.office} onChange={(event) => setExpenseDraft((current) => ({ ...current, office: event.target.value }))}><option value="">Company-wide / derive from employee</option>{offices.map((office) => <option key={getId(office)} value={getId(office)}>{office.code} · {office.name}</option>)}</select></Field>
                <Field label="Description" wide><textarea rows="3" value={expenseDraft.description} onChange={(event) => setExpenseDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Purpose, bill period, items purchased, or internal note" /></Field>
              </div>
            </div>
            <div className="expense-form-section">
              <div className="expense-form-label"><span>02</span><div><strong>Payment path</strong><small>Who funded this expense</small></div></div>
              <div className="expense-payment-options">
                {PAYMENT_TYPES.map(({ value, label, hint, icon: Icon }) => <button type="button" key={value} className={expenseDraft.paymentType === value ? "active" : ""} onClick={() => setExpenseDraft((current) => ({ ...current, paymentType: value, paidByEmployee: value === "company_direct" ? "" : current.paidByEmployee, advanceAmount: value === "advance" ? current.advanceAmount : "" }))}><span><Icon size={18} /></span><strong>{label}</strong><small>{hint}</small><i>{expenseDraft.paymentType === value && <Check size={13} />}</i></button>)}
              </div>
              {expenseDraft.paymentType !== "company_direct" && <div className="expense-form-grid payment-details"><Field label="Employee *"><select required value={expenseDraft.paidByEmployee} onChange={(event) => setExpenseDraft((current) => ({ ...current, paidByEmployee: event.target.value }))}><option value="">Choose employee…</option>{employees.map((employee) => <option key={getId(employee)} value={getId(employee)}>{employee.employeeCode} · {employee.fullName}</option>)}</select></Field>{expenseDraft.paymentType === "advance" && <Field label="Advance issued (PKR) *"><input required type="number" min="0.01" step="0.01" value={expenseDraft.advanceAmount} onChange={(event) => setExpenseDraft((current) => ({ ...current, advanceAmount: event.target.value }))} /><small className="expense-field-note">Variance: {money((Number(expenseDraft.amount) || 0) - (Number(expenseDraft.advanceAmount) || 0))}</small></Field>}</div>}
            </div>
            <div className="expense-form-section">
              <div className="expense-form-label"><span>03</span><div><strong>Proof &amp; approval</strong><small>Receipt and manager signature</small></div></div>
              <div className="expense-evidence-grid">
                <EvidenceDrop label="Receipt image" hint="Drop a file or use phone camera" icon={Camera} file={receiptFile} existing={existingEvidence.receipt} onFile={setReceiptFile} capture="environment" />
                {canManage ? <div className="expense-signature-choice">
                  <div><button type="button" className={signatureMode === "draw" ? "active" : ""} onClick={() => setSignatureMode("draw")}>Draw signature</button><button type="button" className={signatureMode === "upload" ? "active" : ""} onClick={() => setSignatureMode("upload")}>Upload signed receipt</button></div>
                  {signatureMode === "draw" ? <SignaturePad onChange={setSignatureFile} resetKey={signatureReset} /> : <EvidenceDrop label="Signature image" hint="Upload signed approval" icon={Signature} file={signatureFile} existing={existingEvidence.signature} onFile={setSignatureFile} />}
                </div> : <div className="expense-manager-signoff"><span><ShieldCheck size={22} /></span><div><strong>Manager signature required</strong><p>Tahir Mushtaq or another authorized Manager/CEO will attach the approval signature during verification.</p></div></div>}
              </div>
              <div className="expense-security-note"><ShieldCheck size={18} /><div><strong>Protected financial evidence</strong><p>Files are resized before upload, stored privately, and every access is added to the audit trail.</p></div></div>
            </div>
            <footer className="expense-form-footer"><div><span>{selectedPayment.label}</span><strong>{money(expenseDraft.amount)}</strong></div><button type="submit" className="expense-button submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={17} /> Saving…</> : <><FileCheck2 size={17} /> {editingId ? "Save correction" : "Add to ledger"}</>}</button></footer>
          </form>
          <aside className="expense-entry-guide">
            <p>Entry checklist</p>
            <h3>Fast enough for the field.<br />Strict enough for finance.</h3>
            {[["Date and amount", Boolean(expenseDraft.date && Number(expenseDraft.amount) > 0)], ["Category and payee", Boolean(expenseDraft.category && expenseDraft.vendorOrPayee)], ["Funding source", expenseDraft.paymentType === "company_direct" || Boolean(expenseDraft.paidByEmployee)], ["Receipt evidence", Boolean(receiptFile) || existingEvidence.receipt], ["Manager signature", Boolean(signatureFile) || existingEvidence.signature]].map(([label, ready]) => <span className={ready ? "ready" : ""} key={label}>{ready ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}{label}</span>)}
            <div><strong>Manager verification</strong><p>A record only becomes verified after both receipt and signature evidence are present.</p></div>
          </aside>
        </section>
      )}

      {activeView === "verification" && (
        <section className="expense-verification">
          <header className="expense-section-head"><div><p>Approval desk</p><h2>Verification queue</h2><span>{canManage ? "Review receipts, signatures, and employee liabilities." : "Monitor records waiting for manager approval."}</span></div><span className="expense-queue-count">{reportOverview.pendingVerification || pendingExpenses.length} pending</span></header>
          <div className="expense-review-grid">
            {pendingExpenses.map((expense) => {
              const PaymentIcon = paymentMeta(expense.paymentType).icon;
              const adminCanAddReceipt =
                role === "Admin" &&
                !expense.receipt?.available &&
                getId(expense.createdBy) === getId(admin);
              return <article key={getId(expense)} className="expense-review-card"><header><span>{expense.categorySnapshot}</span><Status value={expense.verificationStatus} /></header><div className="expense-review-amount"><small>{expense.expenseNumber} · {dateLabel(expense.date)}</small><strong>{money(expense.amount)}</strong><p>{expense.vendorOrPayee}</p></div><div className="expense-review-meta"><span><PaymentIcon size={15} />{paymentMeta(expense.paymentType).label}</span><span><Building2 size={15} />{expense.office?.code || "Company"}</span>{expense.paidByEmployee && <span><UserRound size={15} />{expense.paidByEmployee.fullName}</span>}</div><div className="expense-review-evidence"><button type="button" disabled={!expense.receipt?.available} onClick={() => viewEvidence(expense, "receipt")} className={expense.receipt?.available ? "ready" : ""}><ReceiptText size={16} /><span><strong>Receipt</strong><small>{expense.receipt?.available ? "Ready to inspect" : "Missing"}</small></span>{expense.receipt?.available ? <Eye size={15} /> : <AlertCircle size={15} />}</button><button type="button" disabled={!expense.signature?.available} onClick={() => viewEvidence(expense, "signature")} className={expense.signature?.available ? "ready" : ""}><Signature size={16} /><span><strong>Signature</strong><small>{expense.signature?.available ? "Approval attached" : "Missing"}</small></span>{expense.signature?.available ? <Eye size={15} /> : <AlertCircle size={15} />}</button></div><footer>{canManage && (!expense.receipt?.available || !expense.signature?.available) && <button type="button" onClick={() => editExpense(expense)}><Pencil size={15} /> Complete evidence</button>}{adminCanAddReceipt && <button type="button" onClick={() => editExpense(expense)}><Camera size={15} /> Add receipt</button>}<button type="button" className="review" onClick={() => loadExpense(getId(expense))}>{canManage ? "Review entry" : "View entry"} <ChevronRight size={15} /></button></footer></article>;
            })}
          </div>
          {!pendingExpenses.length && !loading && <div className="expense-empty large"><CheckCircle2 size={32} /><strong>The verification queue is clear</strong><p>New pending expenses will appear here automatically.</p></div>}
        </section>
      )}

      {activeView === "reports" && (
        <section className="expense-reports">
          <header className="expense-section-head"><div><p>Financial intelligence</p><h2>Spend &amp; liabilities</h2><span>Monthly patterns, employee obligations, and advance reconciliation.</span></div><div className="expense-report-range"><input aria-label="Report from date" type="date" value={reportRange.from} onChange={(event) => setReportRange((current) => ({ ...current, from: event.target.value }))} /><span>to</span><input aria-label="Report to date" type="date" value={reportRange.to} onChange={(event) => setReportRange((current) => ({ ...current, to: event.target.value }))} /><select aria-label="Report office" value={reportRange.office} onChange={(event) => setReportRange((current) => ({ ...current, office: event.target.value }))}><option value="">All offices</option>{offices.map((office) => <option key={getId(office)} value={getId(office)}>{office.code}</option>)}</select><button type="button" onClick={() => fetchReports(reportRange)}>Run</button></div></header>
          <div className="expense-report-grid">
            <article className="expense-category-chart"><header><div><small>Distribution</small><h3>Spend by category</h3></div><strong>{shortMoney(reportOverview.totalExpense)}</strong></header><div>{(reports?.byCategory || []).map((item, index) => <div className="expense-bar-row" key={item.category}><span>{String(index + 1).padStart(2, "0")}</span><div><p><strong>{item.category}</strong><small>{item.count} entries · {money(item.total)}</small></p><i><b style={{ width: `${Math.max(4, (item.total / maxCategoryTotal) * 100)}%` }} /></i></div></div>)}</div>{!reports?.byCategory?.length && <div className="expense-empty"><TrendingUp size={24} /><strong>No spend in this period</strong></div>}</article>
            <article className="expense-monthly-card"><header><div><small>Cadence</small><h3>Monthly expense</h3></div><TrendingUp size={21} /></header><div className="expense-month-bars">{(reports?.byMonth || []).slice(-12).map((item) => { const max = Math.max(...(reports?.byMonth || []).map((row) => row.total), 1); return <span key={item.month}><i><b style={{ height: `${Math.max(5, (item.total / max) * 100)}%` }} /></i><small>{item.month.slice(5)}</small><strong>{shortMoney(item.total)}</strong></span>; })}</div></article>
            <article className="expense-liability-card"><header><div><small>Liability</small><h3>Owed to employees</h3></div><strong>{shortMoney(reportOverview.outstandingReimbursements)}</strong></header><div>{(reports?.outstandingReimbursements || []).slice(0, 6).map((expense) => <button type="button" key={getId(expense)} onClick={() => loadExpense(getId(expense))}><span>{initials(expense.paidByEmployee?.fullName)}</span><div><strong>{expense.paidByEmployee?.fullName}</strong><small>{expense.expenseNumber} · {expense.reimbursementStatus}</small></div><b>{money(expense.amount)}</b></button>)}</div>{!reports?.outstandingReimbursements?.length && <div className="expense-empty small"><CheckCircle2 size={22} /><strong>No outstanding reimbursements</strong></div>}</article>
            <article className="expense-advance-card"><header><div><small>Petty cash</small><h3>Advance reconciliation</h3></div><span className={Number(reportOverview.advanceVariance) > 0 ? "over" : "under"}>{Number(reportOverview.advanceVariance) > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{money(Math.abs(Number(reportOverview.advanceVariance) || 0))}</span></header><div className="expense-advance-summary"><span><small>Issued</small><strong>{money(reportOverview.advanceIssued)}</strong></span><span><small>Actual</small><strong>{money(reportOverview.advanceActual)}</strong></span><span><small>Open</small><strong>{reportOverview.openAdvances || 0}</strong></span></div><div>{(reports?.advances || []).slice(0, 5).map((expense) => <button type="button" key={getId(expense)} onClick={() => loadExpense(getId(expense))}><span><strong>{expense.paidByEmployee?.fullName}</strong><small>{expense.expenseNumber}</small></span><span><Status value={expense.advanceStatus} /><b className={Number(expense.advanceVariance) > 0 ? "over" : "under"}>{Number(expense.advanceVariance) > 0 ? "+" : ""}{money(expense.advanceVariance)}</b></span></button>)}</div></article>
            <article className="expense-employee-report"><header><div><small>Accountability</small><h3>Per-employee spend</h3></div><UserRound size={21} /></header><div>{(reports?.byEmployee || []).map((row) => <div key={getId(row.employee)}><span>{initials(row.employee.fullName)}</span><div><strong>{row.employee.fullName}</strong><small>{row.employee.employeeCode} · {row.recordCount} records</small></div><p><strong>{money(row.totalSpend)}</strong><small>{row.outstanding ? `${money(row.outstanding)} owed` : "Settled"}</small></p></div>)}</div></article>
          </div>
        </section>
      )}

      {activeView === "categories" && canManage && (
        <section className="expense-categories">
          <header className="expense-section-head"><div><p>Ledger structure</p><h2>Expense categories</h2><span>Keep entry consistent without losing useful sub-category detail.</span></div></header>
          <div className="expense-category-layout">
            <form onSubmit={saveCategory}><span className="expense-category-icon"><ListFilter size={22} /></span><p>{editingCategoryId ? "Edit classification" : "New classification"}</p><h3>{editingCategoryId ? "Update category" : "Add a category"}</h3><Field label="Category name *"><input required value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Compliance" /></Field><Field label="Sub-categories"><textarea rows="5" value={categoryDraft.subCategories} onChange={(event) => setCategoryDraft((current) => ({ ...current, subCategories: event.target.value }))} placeholder="Licensing, Audit fee, Certification" /><small className="expense-field-note">Separate each item with a comma.</small></Field><Field label="Status"><select value={categoryDraft.status} onChange={(event) => setCategoryDraft((current) => ({ ...current, status: event.target.value }))}><option>Active</option><option>Inactive</option></select></Field><button type="submit" className="expense-button submit" disabled={saving}>{saving ? "Saving…" : editingCategoryId ? "Save category" : "Add category"}</button>{editingCategoryId && <button type="button" className="expense-link-button" onClick={() => { setEditingCategoryId(""); setCategoryDraft({ name: "", subCategories: "", status: "Active" }); }}>Cancel edit</button>}</form>
            <div className="expense-category-list">{categories.map((category, index) => <article key={getId(category)}><span>{String(index + 1).padStart(2, "0")}</span><div><header><strong>{category.name}</strong><Status value={category.status} /></header><p>{category.subCategories?.join(" · ") || "No sub-categories"}</p></div><button type="button" aria-label={`Edit ${category.name}`} onClick={() => { setEditingCategoryId(getId(category)); setCategoryDraft({ name: category.name, subCategories: (category.subCategories || []).join(", "), status: category.status }); }}><Pencil size={16} /></button>{isCEO && <button type="button" className="danger" aria-label={`Delete ${category.name}`} onClick={async () => { try { const response = await fetch(`${API_BASE_URL}/expense-categories/${getId(category)}`, { method: "DELETE", headers: authHeaders() }); const payload = await readJson(response, "Could not delete category"); setNotice(payload.message); await Promise.all([fetchCategories(), fetchLookups()]); } catch (requestError) { if (requestError.message !== "Deletion cancelled.") setError(requestError.message); } }}><Trash2 size={16} /></button>}</article>)}</div>
          </div>
        </section>
      )}

      {selectedExpense && (
        <div className="expense-detail-layer" role="presentation" onMouseDown={() => !saving && setSelectedExpense(null)}>
          <aside className="expense-detail-panel" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p>{selectedExpense.expenseNumber}</p><h2 id="expense-detail-title">{selectedExpense.categorySnapshot}</h2><span>{selectedExpense.subCategory || "General expense"} · {dateLabel(selectedExpense.date)}</span></div><button type="button" aria-label="Close expense detail" onClick={() => setSelectedExpense(null)}><X size={19} /></button></header>
            <div className="expense-detail-amount"><small>Recorded spend</small><strong>{money(selectedExpense.amount)}</strong><Status value={selectedExpense.verificationStatus} /></div>
            <div className="expense-detail-facts"><span><small>Vendor / payee</small><strong>{selectedExpense.vendorOrPayee}</strong></span><span><small>Payment path</small><strong>{paymentMeta(selectedExpense.paymentType).label}</strong></span><span><small>Office</small><strong>{selectedExpense.office?.name || "Company-wide"}</strong></span><span><small>Paid by employee</small><strong>{selectedExpense.paidByEmployee?.fullName || "Not applicable"}</strong></span></div>
            {selectedExpense.description && <div className="expense-detail-note"><small>Description</small><p>{selectedExpense.description}</p></div>}
            <section className="expense-detail-evidence"><div><p>Protected evidence</p><span>Every view is logged</span></div><button type="button" disabled={!selectedExpense.receipt?.available} onClick={() => viewEvidence(selectedExpense, "receipt")}><ReceiptText size={18} /><span><strong>Receipt</strong><small>{selectedExpense.receipt?.fileName || "Not attached"}</small></span><Eye size={16} /></button><button type="button" disabled={!selectedExpense.signature?.available} onClick={() => viewEvidence(selectedExpense, "signature")}><Signature size={18} /><span><strong>Signature</strong><small>{selectedExpense.signature?.fileName || "Not attached"}</small></span><Eye size={16} /></button></section>
            {canManage && selectedExpense.verificationStatus === "pending" && <section className="expense-approval-box"><div><ShieldCheck size={19} /><span><strong>Manager decision</strong><small>Both evidence files are required to verify.</small></span></div><textarea rows="3" value={reviewDraft.notes} onChange={(event) => setReviewDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Verification or rejection note" /><div><button type="button" className="reject" disabled={saving || !reviewDraft.notes.trim()} onClick={() => expenseAction("verify", { status: "rejected", notes: reviewDraft.notes }, "Expense rejected")}><XCircle size={16} /> Reject</button><button type="button" className="verify" disabled={saving || !selectedExpense.evidenceReady} onClick={() => expenseAction("verify", { status: "verified", notes: reviewDraft.notes }, "Expense verified")}><CheckCircle2 size={16} /> Verify record</button></div></section>}
            {canManage && selectedExpense.paymentType === "employee_reimbursement" && selectedExpense.verificationStatus === "verified" && selectedExpense.reimbursementStatus !== "paid" && <section className="expense-settlement-box"><div><HandCoins size={19} /><span><strong>Settle employee liability</strong><small>{money(selectedExpense.amount)} owed to {selectedExpense.paidByEmployee?.fullName}</small></span></div><select value={reviewDraft.via} onChange={(event) => setReviewDraft((current) => ({ ...current, via: event.target.value }))}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option></select><button type="button" disabled={saving} onClick={() => expenseAction("reimbursement", { status: "paid", via: reviewDraft.via }, "Reimbursement paid")}><Banknote size={16} /> Mark paid</button></section>}
            {canManage && selectedExpense.paymentType === "advance" && selectedExpense.verificationStatus === "verified" && selectedExpense.advanceStatus !== "settled" && <section className="expense-settlement-box"><div><WalletCards size={19} /><span><strong>Reconcile advance</strong><small>Variance {money(selectedExpense.advanceVariance)}</small></span></div><button type="button" disabled={saving} onClick={() => expenseAction("reconcile-advance", { notes: reviewDraft.notes }, "Advance reconciled")}><CheckCircle2 size={16} /> Mark settled</button></section>}
            <section className="expense-audit"><div><p>Audit history</p><span>{selectedExpense.auditTrail?.length || 0} events</span></div>{(selectedExpense.auditTrail || []).slice().reverse().map((entry) => <article key={entry._id || `${entry.action}-${entry.at}`}><i /><div><strong>{entry.action.replaceAll("_", " ")}</strong><p>{entry.details || "Record activity"}</p><small>{entry.actorName || entry.actor?.name || "System"} · {dateLabel(entry.at)}</small></div></article>)}</section>
            <footer>{canEditSelected && <button type="button" onClick={() => editExpense(selectedExpense)}><Pencil size={15} /> Edit record</button>}{isCEO && <button type="button" className="danger" onClick={() => deleteExpense(selectedExpense)}><Trash2 size={15} /> Delete</button>}</footer>
          </aside>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, wide = false, children }) => <label className={`expense-field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>;

export default ExpenseManagement;
