import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Box,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  Filter,
  HardDrive,
  IdCard,
  Laptop,
  Mail,
  MapPin,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Undo2,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";
import "./people-assets.css";

const EMPTY_EMPLOYEE = {
  fullName: "",
  phone: "",
  email: "",
  cnic: "",
  currentAddress: "",
  billProofUrl: "",
};

const EMPTY_ASSET = {
  assetTag: "",
  itemType: "Laptop",
  brandModel: "",
  serialNumber: "",
  conditionStatus: "Good",
  assignmentStatus: "Unassigned",
  specs: {
    processor: "",
    ram: "",
    storage: "",
    operatingSystem: "",
    notes: "",
  },
};

const ITEM_TYPES = ["Laptop", "Monitor", "Keyboard", "Mouse", "Mobile", "Other"];
const CONDITION_STATUSES = ["New", "Good", "Damaged", "Under Maintenance"];
const ASSIGNMENT_FILTERS = ["All", "Unassigned", "Assigned", "Retired"];

const getId = (value) => String(value?._id || value?.id || value || "");

const authHeaders = () => {
  try {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const readJson = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = parseApiError(payload, fallbackMessage);
    throw new Error(parsed.issues[0] || parsed.summary);
  }
  return payload;
};

const formatCnicInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

const formatDate = (value, includeYear = true) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
};

const getInitials = (name) =>
  String(name || "Employee")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EM";

const getAssetIcon = (type) => {
  if (type === "Laptop") return Laptop;
  if (type === "Monitor") return Monitor;
  if (type === "Mouse") return MousePointer2;
  if (type === "Mobile") return Smartphone;
  if (type === "Keyboard") return HardDrive;
  return Box;
};

const specEntries = (specs) =>
  Object.entries(specs || {})
    .filter(([, value]) => String(value || "").trim())
    .map(([key, value]) => [
      key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
      value,
    ]);

const assignmentTone = (status) =>
  status === "Assigned" ? "assigned" : status === "Retired" ? "retired" : "available";

const conditionTone = (condition) =>
  condition === "Damaged"
    ? "danger"
    : condition === "Under Maintenance"
      ? "maintenance"
      : "healthy";

const PeopleAssets = () => {
  const [activeView, setActiveView] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("All");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [modal, setModal] = useState(null);
  const [employeeDraft, setEmployeeDraft] = useState(EMPTY_EMPLOYEE);
  const [assetDraft, setAssetDraft] = useState(EMPTY_ASSET);
  const [assignmentDraft, setAssignmentDraft] = useState({
    employeeId: "",
    assetId: "",
  });
  const [billProofFile, setBillProofFile] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWorkspace = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const headers = { ...authHeaders() };
      const [employeesResponse, assetsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/employees?limit=100`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/assets?limit=150`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const [employeePayload, assetPayload] = await Promise.all([
        readJson(employeesResponse, "Could not load employee records"),
        readJson(assetsResponse, "Could not load company assets"),
      ]);

      setEmployees(Array.isArray(employeePayload?.data) ? employeePayload.data : []);
      setAssets(Array.isArray(assetPayload?.data) ? assetPayload.data : []);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError?.message || "Could not load the people and equipment workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (!modal) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving) setModal(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, saving]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [getId(employee), employee])),
    [employees]
  );

  const assetCountsByEmployee = useMemo(() => {
    const counts = new Map();
    assets.forEach((asset) => {
      const employeeId = getId(asset.assignedEmployee);
      if (employeeId) counts.set(employeeId, (counts.get(employeeId) || 0) + 1);
    });
    return counts;
  }, [assets]);

  const selectedEmployee = employeeById.get(selectedEmployeeId) || null;
  const selectedEmployeeAssets = useMemo(
    () =>
      assets.filter(
        (asset) => getId(asset.assignedEmployee) === selectedEmployeeId
      ),
    [assets, selectedEmployeeId]
  );

  const filteredEmployees = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((employee) =>
      [
        employee.fullName,
        employee.email,
        employee.phone,
        employee.cnic,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [employees, search]);

  const filteredAssets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesFilter =
        assetFilter === "All" || asset.assignmentStatus === assetFilter;
      const matchesSearch =
        !needle ||
        [
          asset.assetTag,
          asset.brandModel,
          asset.serialNumber,
          asset.itemType,
          asset.assignedEmployee?.fullName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesFilter && matchesSearch;
    });
  }, [assetFilter, assets, search]);

  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.assignmentStatus === "Unassigned"),
    [assets]
  );

  const totals = useMemo(
    () => ({
      people: employees.length,
      assigned: assets.filter((asset) => asset.assignmentStatus === "Assigned").length,
      available: assets.filter((asset) => asset.assignmentStatus === "Unassigned").length,
      attention: assets.filter((asset) =>
        ["Damaged", "Under Maintenance"].includes(asset.conditionStatus)
      ).length,
    }),
    [assets, employees.length]
  );

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setBillProofFile(null);
  };

  const openEmployeeForm = (employee = null) => {
    setEmployeeDraft(
      employee
        ? {
            fullName: employee.fullName || "",
            phone: employee.phone || "",
            email: employee.email || "",
            cnic: employee.cnic || "",
            currentAddress: employee.currentAddress || "",
            billProofUrl: employee.billProofUrl || "",
          }
        : { ...EMPTY_EMPLOYEE }
    );
    setBillProofFile(null);
    setModal({ type: "employee", id: employee ? getId(employee) : "" });
  };

  const openAssetForm = (asset = null) => {
    setAssetDraft(
      asset
        ? {
            assetTag: asset.assetTag || "",
            itemType: asset.itemType || "Laptop",
            brandModel: asset.brandModel || "",
            serialNumber: asset.serialNumber || "",
            conditionStatus: asset.conditionStatus || "Good",
            assignmentStatus: asset.assignmentStatus || "Unassigned",
            specs: {
              ...EMPTY_ASSET.specs,
              ...(asset.specs || {}),
            },
          }
        : {
            ...EMPTY_ASSET,
            specs: { ...EMPTY_ASSET.specs },
          }
    );
    setModal({ type: "asset", id: asset ? getId(asset) : "" });
  };

  const openAssignForm = ({ employeeId = "", assetId = "" } = {}) => {
    setAssignmentDraft({ employeeId, assetId });
    setModal({ type: "assignment" });
  };

  const uploadBillProofIfNeeded = async () => {
    if (!billProofFile) return employeeDraft.billProofUrl;
    const formData = new FormData();
    formData.append("billProof", billProofFile);
    const response = await fetch(`${API_BASE_URL}/employees/bill-proof`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    });
    const payload = await readJson(response, "Could not upload bill proof");
    return payload?.data?.url || "";
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const billProofUrl = await uploadBillProofIfNeeded();
      const isEdit = Boolean(modal?.id);
      const response = await fetch(
        `${API_BASE_URL}/employees${isEdit ? `/${modal.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ ...employeeDraft, billProofUrl }),
        }
      );
      const payload = await readJson(
        response,
        isEdit ? "Could not update employee" : "Could not add employee"
      );
      setNotice(payload?.message || (isEdit ? "Employee updated" : "Employee added"));
      setModal(null);
      setBillProofFile(null);
      await fetchWorkspace({ quiet: true });
      if (payload?.data) setSelectedEmployeeId(getId(payload.data));
    } catch (requestError) {
      setError(requestError?.message || "Could not save employee");
    } finally {
      setSaving(false);
    }
  };

  const saveAsset = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isEdit = Boolean(modal?.id);
      const compactSpecs = Object.fromEntries(
        Object.entries(assetDraft.specs || {}).filter(([, value]) =>
          String(value || "").trim()
        )
      );
      const body = {
        ...assetDraft,
        specs: compactSpecs,
      };
      if (!isEdit) delete body.assignmentStatus;

      const response = await fetch(
        `${API_BASE_URL}/assets${isEdit ? `/${modal.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(body),
        }
      );
      const payload = await readJson(
        response,
        isEdit ? "Could not update asset" : "Could not register asset"
      );
      setNotice(payload?.message || (isEdit ? "Asset updated" : "Asset registered"));
      setModal(null);
      await fetchWorkspace({ quiet: true });
    } catch (requestError) {
      setError(requestError?.message || "Could not save asset");
    } finally {
      setSaving(false);
    }
  };

  const assignAsset = async (event) => {
    event.preventDefault();
    if (!assignmentDraft.assetId || !assignmentDraft.employeeId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/assets/${assignmentDraft.assetId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ employeeId: assignmentDraft.employeeId }),
        }
      );
      const payload = await readJson(response, "Could not assign asset");
      setNotice(payload?.message || "Asset assigned");
      setModal(null);
      await fetchWorkspace({ quiet: true });
      setSelectedEmployeeId(assignmentDraft.employeeId);
    } catch (requestError) {
      setError(requestError?.message || "Could not assign asset");
    } finally {
      setSaving(false);
    }
  };

  const unassignAsset = async (asset) => {
    const assignee = asset.assignedEmployee?.fullName || "this employee";
    if (
      !window.confirm(
        `Return ${asset.assetTag} from ${assignee} to available inventory?`
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/assets/${getId(asset)}/unassign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({}),
        }
      );
      const payload = await readJson(response, "Could not return asset");
      setNotice(payload?.message || "Asset returned to inventory");
      await fetchWorkspace({ quiet: true });
    } catch (requestError) {
      setError(requestError?.message || "Could not return asset");
    } finally {
      setSaving(false);
    }
  };

  const renderEmpty = (kind) => (
    <div className="people-assets-empty" role="status">
      <span aria-hidden="true">
        {kind === "employees" ? <UsersRound size={26} /> : <PackageCheck size={26} />}
      </span>
      <div>
        <strong>
          {search
            ? `No ${kind === "employees" ? "employees" : "assets"} match your search`
            : kind === "employees"
              ? "Your employee directory is ready"
              : "Your equipment register is ready"}
        </strong>
        <p>
          {search
            ? "Try a name, CNIC, asset tag, serial number, or model."
            : kind === "employees"
              ? "Add the first employee to start linking company equipment."
              : "Register the first company-owned item to track its custody."}
        </p>
      </div>
      {!search && (
        <button
          type="button"
          className="pa-button primary"
          onClick={() => (kind === "employees" ? openEmployeeForm() : openAssetForm())}
        >
          <Plus size={16} />
          {kind === "employees" ? "Add employee" : "Register asset"}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="people-assets-page people-assets-loading">
        <div className="pa-loading-mark" aria-hidden="true">
          <UsersRound size={28} />
        </div>
        <strong>Opening people & equipment…</strong>
        <p>Preparing employee records and the company asset ledger.</p>
      </div>
    );
  }

  return (
    <div className="people-assets-page">
      <header className="pa-hero">
        <div className="pa-hero-copy">
          <p className="pa-eyebrow">
            <ShieldCheck size={15} aria-hidden="true" />
            Custody workspace
          </p>
          <h1>People &amp; equipment</h1>
          <p>
            One private record for every employee—and a clear chain of custody
            for every company-owned device.
          </p>
        </div>
        <div className="pa-hero-actions">
          <button
            type="button"
            className="pa-button secondary"
            onClick={() => openAssetForm()}
          >
            <BriefcaseBusiness size={17} />
            Register asset
          </button>
          <button
            type="button"
            className="pa-button primary"
            onClick={() => openEmployeeForm()}
          >
            <Plus size={17} />
            Add employee
          </button>
        </div>
      </header>

      <section className="pa-metrics" aria-label="People and asset summary">
        <article>
          <span className="pa-metric-icon people" aria-hidden="true">
            <UsersRound size={19} />
          </span>
          <div>
            <small>Employees</small>
            <strong>{totals.people}</strong>
            <p>Private records</p>
          </div>
        </article>
        <article>
          <span className="pa-metric-icon assigned" aria-hidden="true">
            <ClipboardCheck size={19} />
          </span>
          <div>
            <small>In custody</small>
            <strong>{totals.assigned}</strong>
            <p>Assigned assets</p>
          </div>
        </article>
        <article>
          <span className="pa-metric-icon available" aria-hidden="true">
            <PackageCheck size={19} />
          </span>
          <div>
            <small>Available</small>
            <strong>{totals.available}</strong>
            <p>Ready to issue</p>
          </div>
        </article>
        <article>
          <span className="pa-metric-icon attention" aria-hidden="true">
            <Wrench size={19} />
          </span>
          <div>
            <small>Needs attention</small>
            <strong>{totals.attention}</strong>
            <p>Repair or review</p>
          </div>
        </article>
      </section>

      {(error || notice) && (
        <div
          className={`pa-message ${error ? "error" : "success"}`}
          role={error ? "alert" : "status"}
        >
          {error ? <CircleAlert size={18} /> : <Check size={18} />}
          <span>{error || notice}</span>
          <button
            type="button"
            onClick={() => (error ? setError("") : setNotice(""))}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="pa-workspace">
        <div className="pa-toolbar">
          <div className="pa-view-switch" role="tablist" aria-label="Workspace view">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "employees"}
              className={activeView === "employees" ? "active" : ""}
              onClick={() => {
                setActiveView("employees");
                setSearch("");
              }}
            >
              <UsersRound size={16} />
              Employee directory
              <span>{employees.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "assets"}
              className={activeView === "assets" ? "active" : ""}
              onClick={() => {
                setActiveView("assets");
                setSearch("");
              }}
            >
              <BriefcaseBusiness size={16} />
              Asset inventory
              <span>{assets.length}</span>
            </button>
          </div>

          <div className="pa-toolbar-tools">
            <label className="pa-search">
              <Search size={17} aria-hidden="true" />
              <span className="pa-sr-only">
                Search {activeView === "employees" ? "employees" : "assets"}
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeView === "employees"
                    ? "Search name, CNIC, phone…"
                    : "Search tag, serial, model…"
                }
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <button
              type="button"
              className="pa-icon-button"
              onClick={() => fetchWorkspace({ quiet: true })}
              aria-label="Refresh records"
              title={
                lastUpdated
                  ? `Last updated ${lastUpdated.toLocaleTimeString("en-PK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Refresh records"
              }
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {activeView === "assets" && (
          <div className="pa-filter-row" aria-label="Asset assignment filters">
            <span>
              <Filter size={14} />
              Status
            </span>
            {ASSIGNMENT_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter}
                className={assetFilter === filter ? "active" : ""}
                onClick={() => setAssetFilter(filter)}
              >
                {filter === "Unassigned" ? "Available" : filter}
                <small>
                  {filter === "All"
                    ? assets.length
                    : assets.filter((asset) => asset.assignmentStatus === filter).length}
                </small>
              </button>
            ))}
          </div>
        )}

        {activeView === "employees" ? (
          filteredEmployees.length ? (
            <div className="pa-table-wrap">
              <table className="pa-table">
                <caption className="pa-sr-only">
                  Employees, contact information, CNIC, and assigned equipment count.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Contact</th>
                    <th scope="col">CNIC</th>
                    <th scope="col">Equipment</th>
                    <th scope="col">Added</th>
                    <th scope="col"><span className="pa-sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const employeeId = getId(employee);
                    const equipmentCount = assetCountsByEmployee.get(employeeId) || 0;
                    return (
                      <tr key={employeeId}>
                        <td data-label="Employee">
                          <button
                            type="button"
                            className="pa-person"
                            onClick={() => setSelectedEmployeeId(employeeId)}
                          >
                            <span aria-hidden="true">{getInitials(employee.fullName)}</span>
                            <span>
                              <strong>{employee.fullName}</strong>
                              <small>{employee.email}</small>
                            </span>
                          </button>
                        </td>
                        <td data-label="Contact">
                          <a className="pa-contact-link" href={`tel:${employee.phone}`}>
                            {employee.phone}
                          </a>
                        </td>
                        <td data-label="CNIC"><code>{employee.cnic}</code></td>
                        <td data-label="Equipment">
                          <span
                            className={`pa-count-pill${equipmentCount ? " has-assets" : ""}`}
                          >
                            {equipmentCount} {equipmentCount === 1 ? "item" : "items"}
                          </span>
                        </td>
                        <td data-label="Added">{formatDate(employee.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="pa-row-action"
                            onClick={() => setSelectedEmployeeId(employeeId)}
                            aria-label={`View ${employee.fullName}`}
                          >
                            <ChevronRight size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            renderEmpty("employees")
          )
        ) : filteredAssets.length ? (
          <div className="pa-table-wrap">
            <table className="pa-table asset-table">
              <caption className="pa-sr-only">
                Company asset inventory with serial, condition, and current assignee.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Asset</th>
                  <th scope="col">Serial number</th>
                  <th scope="col">Key specifications</th>
                  <th scope="col">Condition</th>
                  <th scope="col">Custody</th>
                  <th scope="col"><span className="pa-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const AssetIcon = getAssetIcon(asset.itemType);
                  const specs = specEntries(asset.specs).slice(0, 3);
                  return (
                    <tr key={getId(asset)}>
                      <td data-label="Asset">
                        <div className="pa-asset-name">
                          <span aria-hidden="true"><AssetIcon size={18} /></span>
                          <div>
                            <strong>{asset.brandModel}</strong>
                            <small>{asset.assetTag} · {asset.itemType}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Serial number"><code>{asset.serialNumber}</code></td>
                      <td data-label="Specifications">
                        <div className="pa-spec-line">
                          {specs.length
                            ? specs.map(([label, value]) => (
                                <span key={label}>{value}</span>
                              ))
                            : <span>Not recorded</span>}
                        </div>
                      </td>
                      <td data-label="Condition">
                        <span className={`pa-condition ${conditionTone(asset.conditionStatus)}`}>
                          {asset.conditionStatus}
                        </span>
                      </td>
                      <td data-label="Custody">
                        <div className="pa-custody">
                          <span className={`pa-status-dot ${assignmentTone(asset.assignmentStatus)}`} />
                          <span>
                            <strong>
                              {asset.assignedEmployee?.fullName ||
                                (asset.assignmentStatus === "Retired" ? "Retired" : "Available")}
                            </strong>
                            <small>
                              {asset.assignedDate
                                ? `Since ${formatDate(asset.assignedDate, false)}`
                                : asset.assignmentStatus === "Unassigned"
                                  ? "Ready to issue"
                                  : "Out of circulation"}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="pa-row-actions">
                          {asset.assignmentStatus === "Unassigned" && (
                            <button
                              type="button"
                              className="pa-small-action issue"
                              onClick={() => openAssignForm({ assetId: getId(asset) })}
                            >
                              Issue
                            </button>
                          )}
                          {asset.assignmentStatus === "Assigned" && (
                            <button
                              type="button"
                              className="pa-small-action return"
                              onClick={() => unassignAsset(asset)}
                              disabled={saving}
                            >
                              Return
                            </button>
                          )}
                          <button
                            type="button"
                            className="pa-row-action"
                            onClick={() => openAssetForm(asset)}
                            aria-label={`Edit ${asset.assetTag}`}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          renderEmpty("assets")
        )}
      </section>

      {selectedEmployee && (
        <>
          <button
            type="button"
            className="pa-drawer-backdrop"
            onClick={() => setSelectedEmployeeId("")}
            aria-label="Close employee profile"
          />
          <aside
            className="pa-profile-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-profile-title"
          >
            <div className="pa-drawer-head">
              <span>Employee record</span>
              <div>
                <button
                  type="button"
                  onClick={() => openEmployeeForm(selectedEmployee)}
                  aria-label="Edit employee"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeId("")}
                  aria-label="Close employee profile"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="pa-profile-identity">
              <span className="pa-profile-avatar" aria-hidden="true">
                {getInitials(selectedEmployee.fullName)}
              </span>
              <div>
                <p><BadgeCheck size={14} /> Verified record</p>
                <h2 id="employee-profile-title">{selectedEmployee.fullName}</h2>
                <span>Added {formatDate(selectedEmployee.createdAt)}</span>
              </div>
            </div>

            <dl className="pa-profile-facts">
              <div>
                <dt><Phone size={15} /> Phone</dt>
                <dd><a href={`tel:${selectedEmployee.phone}`}>{selectedEmployee.phone}</a></dd>
              </div>
              <div>
                <dt><Mail size={15} /> Email</dt>
                <dd><a href={`mailto:${selectedEmployee.email}`}>{selectedEmployee.email}</a></dd>
              </div>
              <div>
                <dt><IdCard size={15} /> CNIC</dt>
                <dd><code>{selectedEmployee.cnic}</code></dd>
              </div>
              <div className="wide">
                <dt><MapPin size={15} /> Residential address</dt>
                <dd>{selectedEmployee.currentAddress}</dd>
              </div>
            </dl>

            <div className="pa-proof-card">
              <span aria-hidden="true"><FileCheck2 size={20} /></span>
              <div>
                <strong>Electricity bill proof</strong>
                <p>
                  {selectedEmployee.billProofUrl
                    ? "A supporting document is attached to this record."
                    : "No supporting document has been attached yet."}
                </p>
              </div>
              {selectedEmployee.billProofUrl && (
                <a
                  href={selectedEmployee.billProofUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View <ArrowUpRight size={14} />
                </a>
              )}
            </div>

            <section className="pa-equipment-section">
              <div className="pa-section-heading">
                <div>
                  <span>Assigned company equipment</span>
                  <h3>
                    {selectedEmployeeAssets.length}{" "}
                    {selectedEmployeeAssets.length === 1 ? "item" : "items"} in custody
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openAssignForm({ employeeId: selectedEmployeeId })
                  }
                  disabled={!availableAssets.length}
                  title={
                    availableAssets.length
                      ? "Assign available equipment"
                      : "No equipment is currently available"
                  }
                >
                  <Plus size={15} /> Assign
                </button>
              </div>

              <div className="pa-equipment-list">
                {selectedEmployeeAssets.length ? (
                  selectedEmployeeAssets.map((asset) => {
                    const AssetIcon = getAssetIcon(asset.itemType);
                    return (
                      <article key={getId(asset)}>
                        <span className="pa-equipment-icon" aria-hidden="true">
                          <AssetIcon size={18} />
                        </span>
                        <div>
                          <strong>{asset.brandModel}</strong>
                          <p>{asset.assetTag} · {asset.serialNumber}</p>
                          <div>
                            {specEntries(asset.specs)
                              .slice(0, 3)
                              .map(([label, value]) => (
                                <span key={label}>{value}</span>
                              ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => unassignAsset(asset)}
                          disabled={saving}
                          aria-label={`Return ${asset.assetTag}`}
                          title="Return to inventory"
                        >
                          <Undo2 size={16} />
                        </button>
                      </article>
                    );
                  })
                ) : (
                  <div className="pa-equipment-empty">
                    <PackageCheck size={22} />
                    <strong>No equipment assigned</strong>
                    <p>This employee currently has no company assets in custody.</p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </>
      )}

      {modal?.type === "employee" && (
        <div className="pa-modal-layer" role="presentation" onMouseDown={closeModal}>
          <section
            className="pa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pa-modal-head">
              <div>
                <span><UserRound size={14} /> Employee record</span>
                <h2 id="employee-form-title">
                  {modal.id ? "Update employee" : "Add a new employee"}
                </h2>
                <p>Personal details are only visible to authorized managers.</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close form">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveEmployee}>
              <div className="pa-form-grid">
                <label className="wide">
                  <span>Full name *</span>
                  <input
                    required
                    autoFocus
                    value={employeeDraft.fullName}
                    onChange={(event) =>
                      setEmployeeDraft((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Hasham Tahir"
                  />
                </label>
                <label>
                  <span>Phone number *</span>
                  <input
                    required
                    value={employeeDraft.phone}
                    onChange={(event) =>
                      setEmployeeDraft((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="0300-1234567"
                  />
                </label>
                <label>
                  <span>Email address *</span>
                  <input
                    required
                    type="email"
                    value={employeeDraft.email}
                    onChange={(event) =>
                      setEmployeeDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="name@company.com"
                  />
                </label>
                <label className="wide">
                  <span>CNIC number *</span>
                  <input
                    required
                    inputMode="numeric"
                    value={employeeDraft.cnic}
                    onChange={(event) =>
                      setEmployeeDraft((current) => ({
                        ...current,
                        cnic: formatCnicInput(event.target.value),
                      }))
                    }
                    placeholder="35201-1234567-1"
                    maxLength={15}
                  />
                  <small>13 digits; dashes are added automatically.</small>
                </label>
                <label className="wide">
                  <span>Current residential address *</span>
                  <textarea
                    required
                    rows={3}
                    value={employeeDraft.currentAddress}
                    onChange={(event) =>
                      setEmployeeDraft((current) => ({
                        ...current,
                        currentAddress: event.target.value,
                      }))
                    }
                    placeholder="House, street, area, city"
                  />
                </label>
                <label className="wide pa-file-field">
                  <span>Electricity bill proof</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(event) =>
                      setBillProofFile(event.target.files?.[0] || null)
                    }
                  />
                  <span className="pa-file-box">
                    <FileCheck2 size={19} />
                    <span>
                      <strong>
                        {billProofFile?.name ||
                          (employeeDraft.billProofUrl
                            ? "Supporting document already attached"
                            : "Choose an image or PDF")}
                      </strong>
                      <small>JPG, PNG, WebP or PDF · up to 8 MB</small>
                    </span>
                  </span>
                </label>
                <label className="wide">
                  <span>Or paste a proof URL</span>
                  <input
                    type="url"
                    value={employeeDraft.billProofUrl}
                    onChange={(event) =>
                      setEmployeeDraft((current) => ({
                        ...current,
                        billProofUrl: event.target.value,
                      }))
                    }
                    placeholder="https://drive.google.com/…"
                  />
                </label>
              </div>
              <div className="pa-form-footer">
                <button type="button" className="pa-button secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="pa-button primary" disabled={saving}>
                  {saving ? "Saving…" : modal.id ? "Save changes" : "Add employee"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal?.type === "asset" && (
        <div className="pa-modal-layer" role="presentation" onMouseDown={closeModal}>
          <section
            className="pa-modal asset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pa-modal-head">
              <div>
                <span><BriefcaseBusiness size={14} /> Asset register</span>
                <h2 id="asset-form-title">
                  {modal.id ? "Update company asset" : "Register company asset"}
                </h2>
                <p>Record the identity, condition, and key technical details.</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close form">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={saveAsset}>
              <div className="pa-form-grid">
                <label>
                  <span>Asset tag *</span>
                  <input
                    required
                    autoFocus
                    value={assetDraft.assetTag}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        assetTag: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="AST-LAP-0012"
                  />
                </label>
                <label>
                  <span>Category *</span>
                  <select
                    value={assetDraft.itemType}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        itemType: event.target.value,
                      }))
                    }
                  >
                    {ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="wide">
                  <span>Brand &amp; model *</span>
                  <input
                    required
                    value={assetDraft.brandModel}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        brandModel: event.target.value,
                      }))
                    }
                    placeholder="Lenovo ThinkPad E14"
                  />
                </label>
                <label>
                  <span>Serial number *</span>
                  <input
                    required
                    value={assetDraft.serialNumber}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        serialNumber: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="L3-XYZ987123"
                  />
                </label>
                <label>
                  <span>Condition *</span>
                  <select
                    value={assetDraft.conditionStatus}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        conditionStatus: event.target.value,
                      }))
                    }
                  >
                    {CONDITION_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                {modal.id && assetDraft.assignmentStatus !== "Assigned" && (
                  <label className="wide">
                    <span>Inventory status</span>
                    <select
                      value={assetDraft.assignmentStatus}
                      onChange={(event) =>
                        setAssetDraft((current) => ({
                          ...current,
                          assignmentStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="Unassigned">Available</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </label>
                )}
                <div className="pa-form-divider wide">
                  <span>Technical specifications</span>
                  <small>Optional, but useful when issuing or servicing hardware.</small>
                </div>
                {[
                  ["processor", "Processor", "Intel i7 12th Gen"],
                  ["ram", "Memory / RAM", "16 GB"],
                  ["storage", "Storage", "512 GB SSD"],
                  ["operatingSystem", "Operating system", "Windows 11 Pro"],
                ].map(([key, label, placeholder]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input
                      value={assetDraft.specs[key] || ""}
                      onChange={(event) =>
                        setAssetDraft((current) => ({
                          ...current,
                          specs: {
                            ...current.specs,
                            [key]: event.target.value,
                          },
                        }))
                      }
                      placeholder={placeholder}
                    />
                  </label>
                ))}
                <label className="wide">
                  <span>Notes</span>
                  <textarea
                    rows={2}
                    value={assetDraft.specs.notes || ""}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        specs: {
                          ...current.specs,
                          notes: event.target.value,
                        },
                      }))
                    }
                    placeholder="Charger, accessories, warranty, or service notes"
                  />
                </label>
              </div>
              <div className="pa-form-footer">
                <button type="button" className="pa-button secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="pa-button primary" disabled={saving}>
                  {saving ? "Saving…" : modal.id ? "Save asset" : "Register asset"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal?.type === "assignment" && (
        <div className="pa-modal-layer" role="presentation" onMouseDown={closeModal}>
          <section
            className="pa-modal assignment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pa-modal-head">
              <div>
                <span><ClipboardCheck size={14} /> Chain of custody</span>
                <h2 id="assignment-form-title">Issue company equipment</h2>
                <p>This creates a dated assignment in the asset’s custody history.</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close form">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={assignAsset}>
              <div className="pa-assignment-steps">
                <label>
                  <span className="pa-step-number">1</span>
                  <span className="pa-step-copy">
                    <strong>Select employee</strong>
                    <small>The person accepting responsibility for the asset.</small>
                  </span>
                  <select
                    required
                    value={assignmentDraft.employeeId}
                    onChange={(event) =>
                      setAssignmentDraft((current) => ({
                        ...current,
                        employeeId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose employee…</option>
                    {employees.map((employee) => (
                      <option key={getId(employee)} value={getId(employee)}>
                        {employee.fullName} · {employee.cnic}
                      </option>
                    ))}
                  </select>
                </label>
                <ChevronRight size={20} aria-hidden="true" />
                <label>
                  <span className="pa-step-number">2</span>
                  <span className="pa-step-copy">
                    <strong>Select available asset</strong>
                    <small>Only unassigned equipment can be issued.</small>
                  </span>
                  <select
                    required
                    value={assignmentDraft.assetId}
                    onChange={(event) =>
                      setAssignmentDraft((current) => ({
                        ...current,
                        assetId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose asset…</option>
                    {availableAssets.map((asset) => (
                      <option key={getId(asset)} value={getId(asset)}>
                        {asset.assetTag} · {asset.brandModel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!availableAssets.length && (
                <div className="pa-inline-note">
                  <CircleAlert size={16} />
                  No assets are currently available. Return or register equipment first.
                </div>
              )}
              <div className="pa-custody-note">
                <Building2 size={18} />
                <p>
                  <strong>Custody starts today.</strong>
                  The return date will be recorded when this item comes back into inventory.
                </p>
              </div>
              <div className="pa-form-footer">
                <button type="button" className="pa-button secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pa-button primary"
                  disabled={
                    saving ||
                    !availableAssets.length ||
                    !assignmentDraft.employeeId ||
                    !assignmentDraft.assetId
                  }
                >
                  {saving ? "Assigning…" : "Confirm assignment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default PeopleAssets;
