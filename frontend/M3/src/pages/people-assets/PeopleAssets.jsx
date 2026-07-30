/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Box,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  HardDrive,
  IdCard,
  Laptop,
  Mail,
  MapPin,
  Monitor,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Tablet,
  Trash2,
  Undo2,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";
import "./people-assets.css";

const ITEM_TYPES = [
  "Laptop",
  "Desktop",
  "Tablet",
  "Mobile",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Bike",
  "Camera",
  "SIM",
  "Medical Equipment",
  "Office Furniture",
  "Other",
];
const CONDITION_STATUSES = ["New", "Good", "Fair", "Damaged", "Under Maintenance"];
const LIFECYCLE_STATUSES = [
  "Purchased",
  "Registered",
  "Inspected",
  "Available",
  "Under Maintenance",
  "Returned",
  "Transferred",
  "Retired",
  "Sold",
];
const EMPLOYMENT_STATUSES = ["Draft", "Active", "On Leave", "Inactive", "Terminated"];
const ISSUE_TYPES = [
  "Issue",
  "Maintenance",
  "Accident",
  "Traffic Fine",
  "Insurance Claim",
  "Expense",
];
const STEPS = [
  { title: "Identity", hint: "Who they are", icon: UserRound },
  { title: "Employment", hint: "Where they work", icon: Building2 },
  { title: "Documents", hint: "Verify identity", icon: FileCheck2 },
  { title: "Review", hint: "Activate record", icon: ClipboardCheck },
];

const EMPTY_EMPLOYEE = {
  fullName: "",
  phone: "",
  email: "",
  cnic: "",
  currentAddress: "",
  emergencyContact: { name: "", relationship: "", phone: "" },
  office: "",
  department: "",
  designation: "",
  joiningDate: "",
  employmentStatus: "Draft",
};
const EMPTY_OFFICE = {
  name: "",
  code: "",
  city: "",
  address: "",
  managerName: "",
  phone: "",
  status: "Active",
};
const EMPTY_ASSET = {
  assetTag: "",
  itemType: "Laptop",
  brandModel: "",
  serialNumber: "",
  office: "",
  purchaseDate: "",
  purchasePrice: "",
  supplier: "",
  warrantyExpiresAt: "",
  currentLocation: "",
  conditionStatus: "Good",
  lifecycleStatus: "Available",
  specs: {
    processor: "",
    ram: "",
    storage: "",
    operatingSystem: "",
    notes: "",
  },
  bikeDetails: {
    manufacturingYear: "",
    registrationNumber: "",
    engineNumber: "",
    chassisNumber: "",
    color: "",
    currentMileage: "",
    fuelType: "Petrol",
    insuranceExpiresAt: "",
    keysIssued: "1",
    helmetIssued: false,
    accessoriesIssued: "",
    lastServiceDate: "",
    nextServiceDate: "",
    nextServiceMileage: "",
  },
};
const EMPTY_ISSUE = {
  assetId: "",
  reportedByEmployeeId: "",
  type: "Issue",
  title: "",
  description: "",
  severity: "Medium",
  status: "Reported",
  vendor: "",
  cost: "",
  resolution: "",
  nextServiceDate: "",
  nextServiceMileage: "",
};

const getId = (value) => String(value?._id || value?.id || value || "");
const authHeaders = () => {
  try {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};
const currentRole = () => {
  try {
    return JSON.parse(localStorage.getItem("adminData") || "{}")?.role || "";
  } catch {
    return "";
  }
};
const readJson = async (response, fallback) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = parseApiError(payload, fallback);
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
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const money = (value) =>
  `Rs ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(value) || 0
  )}`;
const initials = (name) =>
  String(name || "Employee")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EM";
const assetIcon = (type) => {
  if (["Laptop", "Desktop"].includes(type)) return Laptop;
  if (type === "Monitor") return Monitor;
  if (type === "Mobile") return Smartphone;
  if (type === "Tablet") return Tablet;
  if (type === "Bike") return Bike;
  if (type === "Camera") return Camera;
  if (type === "Medical Equipment") return Stethoscope;
  if (["Keyboard", "Mouse"].includes(type)) return HardDrive;
  return Box;
};
const isOpenIssue = (issue) => ["Reported", "In Progress"].includes(issue.status);

const PeopleAssets = () => {
  const role = currentRole();
  const isCEO = role === "CEO";
  const [activeView, setActiveView] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [assets, setAssets] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [employeeStep, setEmployeeStep] = useState(0);
  const [employeeDraft, setEmployeeDraft] = useState(EMPTY_EMPLOYEE);
  const [employeeFiles, setEmployeeFiles] = useState({});
  const [existingDocumentStatus, setExistingDocumentStatus] = useState({});
  const [photoPreview, setPhotoPreview] = useState("");
  const [employeeValidationStep, setEmployeeValidationStep] = useState(null);
  const [employeeSubmitError, setEmployeeSubmitError] = useState("");
  const [officeDraft, setOfficeDraft] = useState(EMPTY_OFFICE);
  const [assetDraft, setAssetDraft] = useState(EMPTY_ASSET);
  const [assetFiles, setAssetFiles] = useState({});
  const [issueDraft, setIssueDraft] = useState(EMPTY_ISSUE);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState({
    employeeId: "",
    assetId: "",
    issueCondition: "Good",
    issueNotes: "",
  });
  const [assignmentPhoto, setAssignmentPhoto] = useState(null);
  const [returnDraft, setReturnDraft] = useState({
    asset: null,
    returnCondition: "Good",
    returnNotes: "",
  });
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [transferDraft, setTransferDraft] = useState({
    targetType: "employee",
    targetId: "",
    officeId: "",
    reason: "",
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWorkspace = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const headers = authHeaders();
      const responses = await Promise.all([
        fetch(`${API_BASE_URL}/employees?limit=100`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/offices`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/assets?limit=150`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/asset-issues`, { headers, cache: "no-store" }),
      ]);
      const [employeePayload, officePayload, assetPayload, issuePayload] =
        await Promise.all([
          readJson(responses[0], "Could not load employees"),
          readJson(responses[1], "Could not load offices"),
          readJson(responses[2], "Could not load company assets"),
          readJson(responses[3], "Could not load asset issues"),
        ]);
      setEmployees(Array.isArray(employeePayload.data) ? employeePayload.data : []);
      setOffices(Array.isArray(officePayload.data) ? officePayload.data : []);
      setAssets(Array.isArray(assetPayload.data) ? assetPayload.data : []);
      setIssues(Array.isArray(issuePayload.data) ? issuePayload.data : []);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError.message || "Could not load the company registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event) => {
      if (event.key === "Escape" && !saving) setModal(null);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [modal, saving]);

  const loadEmployeeDetail = useCallback(async (id) => {
    if (!id) return;
    setSelectedEmployeeId(id);
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const payload = await readJson(response, "Could not load employee profile");
      setSelectedEmployee(payload.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [getId(employee), employee])),
    [employees]
  );
  const officeMap = useMemo(
    () => new Map(offices.map((office) => [getId(office), office])),
    [offices]
  );
  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.assignmentStatus === "Unassigned"),
    [assets]
  );
  const counts = useMemo(
    () => ({
      employees: employees.length,
      offices: offices.filter((office) => office.status === "Active").length,
      assigned: assets.filter((asset) => asset.assignmentStatus === "Assigned").length,
      openIssues: issues.filter(isOpenIssue).length,
    }),
    [assets, employees.length, issues, offices]
  );

  const filteredEmployees = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return employees.filter((employee) => {
      const officeId = getId(employee.office);
      const officeMatches = officeFilter === "All" || officeId === officeFilter;
      const statusMatches =
        statusFilter === "All" || employee.employmentStatus === statusFilter;
      const searchMatches =
        !needle ||
        [
          employee.employeeCode,
          employee.fullName,
          employee.email,
          employee.phone,
          employee.cnic,
          employee.designation,
          employee.office?.city,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return officeMatches && statusMatches && searchMatches;
    });
  }, [employees, officeFilter, search, statusFilter]);

  const filteredAssets = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return assets.filter((asset) => {
      const officeMatches =
        officeFilter === "All" || getId(asset.office) === officeFilter;
      const statusMatches =
        statusFilter === "All" ||
        asset.assignmentStatus === statusFilter ||
        asset.lifecycleStatus === statusFilter ||
        asset.itemType === statusFilter;
      const searchMatches =
        !needle ||
        [
          asset.assetTag,
          asset.itemType,
          asset.brandModel,
          asset.serialNumber,
          asset.bikeDetails?.registrationNumber,
          asset.assignedEmployee?.fullName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return officeMatches && statusMatches && searchMatches;
    });
  }, [assets, officeFilter, search, statusFilter]);

  const filteredOffices = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return offices.filter(
      (office) =>
        !needle ||
        [office.name, office.code, office.city, office.managerName]
          .join(" ")
          .toLowerCase()
          .includes(needle)
    );
  }, [offices, search]);

  const filteredIssues = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return issues.filter((issue) => {
      const officeMatches =
        officeFilter === "All" || getId(issue.office) === officeFilter;
      const statusMatches = statusFilter === "All" || issue.status === statusFilter;
      const searchMatches =
        !needle ||
        [
          issue.title,
          issue.type,
          issue.asset?.assetTag,
          issue.asset?.brandModel,
          issue.reportedByEmployee?.fullName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return officeMatches && statusMatches && searchMatches;
    });
  }, [issues, officeFilter, search, statusFilter]);

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setEmployeeFiles({});
    setEmployeeValidationStep(null);
    setEmployeeSubmitError("");
    setAssetFiles({});
    setAssignmentPhoto(null);
    setReturnPhoto(null);
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
  };

  const openEmployeeForm = async (employee = null) => {
    let source = employee;
    if (employee && (!employee.activityHistory || !employee.currentAssets)) {
      try {
        const response = await fetch(`${API_BASE_URL}/employees/${getId(employee)}`, {
          headers: authHeaders(),
        });
        source = (await readJson(response, "Could not load employee details")).data;
      } catch (requestError) {
        setError(requestError.message);
        return;
      }
    }
    setEmployeeDraft(
      source
        ? {
            fullName: source.fullName || "",
            phone: source.phone || "",
            email: source.email || "",
            cnic: source.cnic || "",
            currentAddress: source.currentAddress || "",
            emergencyContact: {
              name: source.emergencyContact?.name || "",
              relationship: source.emergencyContact?.relationship || "",
              phone: source.emergencyContact?.phone || "",
            },
            office: getId(source.office),
            department: source.department || "",
            designation: source.designation || "",
            joiningDate: source.joiningDate
              ? new Date(source.joiningDate).toISOString().slice(0, 10)
              : "",
            employmentStatus: source.employmentStatus || "Draft",
          }
        : {
            ...EMPTY_EMPLOYEE,
            emergencyContact: { ...EMPTY_EMPLOYEE.emergencyContact },
            office: offices.length === 1 ? getId(offices[0]) : "",
          }
    );
    setExistingDocumentStatus(source?.documentStatus || {});
    setPhotoPreview(source?.profilePhoto?.url || "");
    setEmployeeFiles({});
    setEmployeeValidationStep(null);
    setEmployeeSubmitError("");
    setEmployeeStep(0);
    setModal({ type: "employee", id: source ? getId(source) : "" });
  };

  const openOfficeForm = (office = null) => {
    setOfficeDraft(
      office
        ? {
            name: office.name || "",
            code: office.code || "",
            city: office.city || "",
            address: office.address || "",
            managerName: office.managerName || "",
            phone: office.phone || "",
            status: office.status || "Active",
          }
        : { ...EMPTY_OFFICE }
    );
    setModal({ type: "office", id: office ? getId(office) : "" });
  };

  const openAssetForm = (asset = null) => {
    setAssetDraft(
      asset
        ? {
            ...EMPTY_ASSET,
            ...asset,
            office: getId(asset.office),
            purchaseDate: asset.purchaseDate
              ? new Date(asset.purchaseDate).toISOString().slice(0, 10)
              : "",
            warrantyExpiresAt: asset.warrantyExpiresAt
              ? new Date(asset.warrantyExpiresAt).toISOString().slice(0, 10)
              : "",
            specs: { ...EMPTY_ASSET.specs, ...(asset.specs || {}) },
            bikeDetails: {
              ...EMPTY_ASSET.bikeDetails,
              ...(asset.bikeDetails || {}),
              insuranceExpiresAt: asset.bikeDetails?.insuranceExpiresAt
                ? new Date(asset.bikeDetails.insuranceExpiresAt).toISOString().slice(0, 10)
                : "",
              lastServiceDate: asset.bikeDetails?.lastServiceDate
                ? new Date(asset.bikeDetails.lastServiceDate).toISOString().slice(0, 10)
                : "",
              nextServiceDate: asset.bikeDetails?.nextServiceDate
                ? new Date(asset.bikeDetails.nextServiceDate).toISOString().slice(0, 10)
                : "",
              accessoriesIssued: Array.isArray(asset.bikeDetails?.accessoriesIssued)
                ? asset.bikeDetails.accessoriesIssued.join(", ")
                : "",
            },
          }
        : {
            ...EMPTY_ASSET,
            specs: { ...EMPTY_ASSET.specs },
            bikeDetails: { ...EMPTY_ASSET.bikeDetails },
            office: offices.length === 1 ? getId(offices[0]) : "",
          }
    );
    setAssetFiles({});
    setModal({ type: "asset", id: asset ? getId(asset) : "" });
  };

  const openIssueForm = (issue = null) => {
    setIssueDraft(
      issue
        ? {
            assetId: getId(issue.asset),
            reportedByEmployeeId: getId(issue.reportedByEmployee),
            type: issue.type || "Issue",
            title: issue.title || "",
            description: issue.description || "",
            severity: issue.severity || "Medium",
            status: issue.status || "Reported",
            vendor: issue.vendor || "",
            cost: issue.cost || "",
            resolution: issue.resolution || "",
            nextServiceDate: issue.nextServiceDate
              ? new Date(issue.nextServiceDate).toISOString().slice(0, 10)
              : "",
            nextServiceMileage: issue.nextServiceMileage || "",
          }
        : { ...EMPTY_ISSUE }
    );
    setModal({ type: "issue", id: issue ? getId(issue) : "" });
  };

  const uploadEmployeeDocument = async (documentType, file) => {
    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/employees/documents`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    return (await readJson(response, `Could not upload ${documentType}`)).data;
  };

  const uploadAssetFile = async (kind, file) => {
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/assets/documents`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    return (await readJson(response, "Could not upload asset file")).data;
  };

  const saveEmployee = async () => {
    setSaving(true);
    setError("");
    setEmployeeSubmitError("");
    try {
      const uploaded = {};
      for (const type of [
        "profilePhoto",
        "cnicFront",
        "cnicBack",
        "contractDocument",
        "billProof",
      ]) {
        if (employeeFiles[type]) {
          uploaded[type] = await uploadEmployeeDocument(type, employeeFiles[type]);
        }
      }
      if (employeeFiles.supportingDocument) {
        uploaded.supportingDocuments = [
          await uploadEmployeeDocument(
            "supportingDocument",
            employeeFiles.supportingDocument
          ),
        ];
      }
      const isEdit = Boolean(modal?.id);
      const response = await fetch(
        `${API_BASE_URL}/employees${isEdit ? `/${modal.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ...employeeDraft, ...uploaded }),
        }
      );
      const payload = await readJson(
        response,
        isEdit ? "Could not update employee" : "Could not add employee"
      );
      setNotice(payload.message || "Employee record saved");
      closeModal();
      await fetchWorkspace({ quiet: true });
      if (payload.data) await loadEmployeeDetail(getId(payload.data));
    } catch (requestError) {
      setEmployeeSubmitError(
        requestError.message || "Could not save employee"
      );
    } finally {
      setSaving(false);
    }
  };

  const employeeSubmit = (event) => {
    event.preventDefault();
    setEmployeeSubmitError("");

    const firstInvalidStep =
      employeeStep === STEPS.length - 1
        ? [0, 1, 2].find(
            (step) => Object.keys(validateEmployeeStep(step)).length > 0
          )
        : Object.keys(validateEmployeeStep(employeeStep)).length > 0
          ? employeeStep
          : undefined;

    if (firstInvalidStep !== undefined) {
      setEmployeeStep(firstInvalidStep);
      setEmployeeValidationStep(firstInvalidStep);
      window.requestAnimationFrame(() => {
        const firstField = document.querySelector(
          ".onboarding-form [data-employee-invalid='true']"
        );
        firstField?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstField
          ?.querySelector("input, select, textarea")
          ?.focus({ preventScroll: true });
      });
      return;
    }

    setEmployeeValidationStep(null);
    if (employeeStep < STEPS.length - 1) {
      setEmployeeStep((step) => step + 1);
      return;
    }
    saveEmployee();
  };

  const saveOffice = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isEdit = Boolean(modal?.id);
      const response = await fetch(
        `${API_BASE_URL}/offices${isEdit ? `/${modal.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(officeDraft),
        }
      );
      const payload = await readJson(response, "Could not save office");
      setNotice(payload.message || "Office saved");
      closeModal();
      await fetchWorkspace({ quiet: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAsset = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const uploaded = {};
      if (assetFiles.photo) {
        const photo = await uploadAssetFile("photo", assetFiles.photo);
        uploaded.photographs = [...(assetDraft.photographs || []), photo];
      }
      if (assetFiles.invoice) {
        uploaded.invoiceDocument = await uploadAssetFile("invoice", assetFiles.invoice);
      }
      const uploadedBikeDocuments = {};
      if (assetDraft.itemType === "Bike" && assetFiles.registration) {
        uploadedBikeDocuments.registrationDocument = await uploadAssetFile(
          "registration",
          assetFiles.registration
        );
      }
      if (assetDraft.itemType === "Bike" && assetFiles.insurance) {
        uploadedBikeDocuments.insuranceDocument = await uploadAssetFile(
          "insurance",
          assetFiles.insurance
        );
      }
      const compactSpecs = Object.fromEntries(
        Object.entries(assetDraft.specs || {}).filter(([, value]) =>
          String(value || "").trim()
        )
      );
      const body = {
        ...assetDraft,
        ...uploaded,
        specs: compactSpecs,
        bikeDetails:
          assetDraft.itemType === "Bike"
            ? { ...assetDraft.bikeDetails, ...uploadedBikeDocuments }
            : undefined,
      };
      delete body.assignmentStatus;
      delete body.assignedEmployee;
      delete body.officeHistory;
      const isEdit = Boolean(modal?.id);
      const response = await fetch(
        `${API_BASE_URL}/assets${isEdit ? `/${modal.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        }
      );
      const payload = await readJson(response, "Could not save company asset");
      setNotice(payload.message || "Asset saved");
      closeModal();
      await fetchWorkspace({ quiet: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveIssue = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isEdit = Boolean(modal?.id);
      const response = await fetch(
        `${API_BASE_URL}/asset-issues${isEdit ? `/${modal.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(issueDraft),
        }
      );
      const payload = await readJson(response, "Could not save issue record");
      setNotice(payload.message || "Issue record saved");
      closeModal();
      await fetchWorkspace({ quiet: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const issuePhotos = assignmentPhoto
        ? [await uploadAssetFile("photo", assignmentPhoto)]
        : [];
      const response = await fetch(
        `${API_BASE_URL}/assets/${assignmentDraft.assetId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ...assignmentDraft, issuePhotos }),
        }
      );
      const payload = await readJson(response, "Could not assign asset");
      setNotice(payload.message || "Asset assigned");
      closeModal();
      await fetchWorkspace({ quiet: true });
      await loadEmployeeDetail(assignmentDraft.employeeId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const returnAsset = (asset) => {
    setReturnDraft({
      asset,
      returnCondition: asset.conditionStatus || "Good",
      returnNotes: "",
    });
    setReturnPhoto(null);
    setModal({ type: "return" });
  };

  const saveReturn = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const returnPhotos = returnPhoto
        ? [await uploadAssetFile("photo", returnPhoto)]
        : [];
      const response = await fetch(
        `${API_BASE_URL}/assets/${getId(returnDraft.asset)}/unassign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            returnCondition: returnDraft.returnCondition,
            returnNotes: returnDraft.returnNotes,
            returnPhotos,
          }),
        }
      );
      const payload = await readJson(response, "Could not return asset");
      setNotice(payload.message);
      closeModal();
      await fetchWorkspace({ quiet: true });
      if (selectedEmployeeId) await loadEmployeeDetail(selectedEmployeeId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveTransfer = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const base =
        transferDraft.targetType === "employee" ? "employees" : "assets";
      const response = await fetch(
        `${API_BASE_URL}/${base}/${transferDraft.targetId}/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            officeId: transferDraft.officeId,
            reason: transferDraft.reason,
          }),
        }
      );
      const payload = await readJson(response, "Could not transfer record");
      setNotice(payload.message);
      closeModal();
      await fetchWorkspace({ quiet: true });
      if (transferDraft.targetType === "employee") {
        await loadEmployeeDetail(transferDraft.targetId);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (kind, id) => {
    const endpoint = {
      employee: "employees",
      office: "offices",
      asset: "assets",
      issue: "asset-issues",
    }[kind];
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const payload = await readJson(response, `Could not delete ${kind}`);
      setNotice(payload.message || "Record deleted");
      if (kind === "employee" && selectedEmployeeId === id) {
        setSelectedEmployeeId("");
        setSelectedEmployee(null);
      }
      await fetchWorkspace({ quiet: true });
    } catch (requestError) {
      if (requestError.message === "Deletion cancelled.") return;
      setError(requestError.message);
    }
  };

  const accessDocument = async (type, action = "view") => {
    if (!selectedEmployeeId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/employees/${selectedEmployeeId}/documents/${type}?action=${action}`,
        { headers: authHeaders(), cache: "no-store" }
      );
      const payload = await readJson(response, "Could not open employee document");
      window.open(payload.data.url, "_blank", "noopener,noreferrer");
      await loadEmployeeDetail(selectedEmployeeId);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const documentReady = (type) =>
    Boolean(employeeFiles[type] || existingDocumentStatus[type]);
  const validateEmployeeStep = (step) => {
    const errors = {};
    const requiredText = (field, value, message) => {
      if (!String(value || "").trim()) errors[field] = message;
    };

    if (step === 0) {
      if (!documentReady("profilePhoto")) {
        errors.profilePhoto = "Upload a recognizable employee photograph.";
      }
      requiredText("fullName", employeeDraft.fullName, "Enter the employee’s full name.");
      if (!/^\d{5}-\d{7}-\d$/.test(employeeDraft.cnic)) {
        errors.cnic = "Enter a complete CNIC in XXXXX-XXXXXXX-X format.";
      }
      if (!/^[+()\d][+()\d\s-]{6,22}$/.test(employeeDraft.phone.trim())) {
        errors.phone = "Enter a valid phone number.";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeDraft.email.trim())) {
        errors.email = "Enter a valid email address.";
      }
      requiredText(
        "currentAddress",
        employeeDraft.currentAddress,
        "Enter the employee’s residential address."
      );
      requiredText(
        "emergencyName",
        employeeDraft.emergencyContact.name,
        "Enter the emergency contact’s name."
      );
      if (
        !/^[+()\d][+()\d\s-]{6,22}$/.test(
          employeeDraft.emergencyContact.phone.trim()
        )
      ) {
        errors.emergencyPhone = "Enter a valid emergency phone number.";
      }
    }

    if (step === 1) {
      requiredText("office", employeeDraft.office, "Choose an office.");
      requiredText(
        "department",
        employeeDraft.department,
        "Enter the employee’s department."
      );
      requiredText(
        "designation",
        employeeDraft.designation,
        "Enter the employee’s designation."
      );
      requiredText(
        "joiningDate",
        employeeDraft.joiningDate,
        "Choose the employee’s joining date."
      );
    }

    if (step === 2) {
      if (!documentReady("cnicFront")) {
        errors.cnicFront = "Upload the front image of the employee’s CNIC.";
      }
      if (!documentReady("cnicBack")) {
        errors.cnicBack = "Upload the back image of the employee’s CNIC.";
      }
    }

    return errors;
  };
  const currentEmployeeStepErrors =
    employeeValidationStep === employeeStep
      ? validateEmployeeStep(employeeStep)
      : {};
  const activationReady =
    documentReady("profilePhoto") &&
    documentReady("cnicFront") &&
    documentReady("cnicBack");
  const selectedOffice = officeMap.get(employeeDraft.office);
  const viewCount = {
    employees: employees.length,
    offices: offices.length,
    assets: assets.length,
    issues: issues.filter(isOpenIssue).length,
  };

  if (loading) {
    return (
      <div className="registry-loading">
        <span><Building2 size={26} /></span>
        <strong>Opening company registry…</strong>
        <p>Preparing offices, employee identity records, and asset custody.</p>
      </div>
    );
  }

  return (
    <div className="registry-page">
      <header className="registry-hero">
        <div>
          <p><ShieldCheck size={15} /> Private operations registry</p>
          <h1>People, places &amp; property</h1>
          <span>
            A complete identity and custody record across every NEES Medical
            office—from onboarding to equipment return.
          </span>
        </div>
        <div className="registry-hero-actions">
          <button
            type="button"
            className="registry-button ghost dark"
            onClick={() => fetchWorkspace()}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            className="registry-button light"
            onClick={() => openAssetForm()}
            disabled={!offices.length}
          >
            <PackageCheck size={16} /> Register asset
          </button>
          <button
            type="button"
            className="registry-button primary"
            onClick={() => openEmployeeForm()}
            disabled={!offices.length}
          >
            <Plus size={16} /> Add employee
          </button>
        </div>
      </header>

      <section className="registry-metrics" aria-label="Registry summary">
        {[
          ["Employees", counts.employees, "Digitized profiles", UsersRound, "teal"],
          ["Active offices", counts.offices, "City locations", Building2, "blue"],
          ["Assets issued", counts.assigned, "In employee custody", ClipboardCheck, "amber"],
          ["Open issues", counts.openIssues, "Need attention", Wrench, "rose"],
        ].map(([label, value, hint, Icon, tone]) => (
          <article key={label}>
            <span className={tone}><Icon size={19} /></span>
            <div><small>{label}</small><strong>{value}</strong><p>{hint}</p></div>
          </article>
        ))}
      </section>

      {!offices.length && (
        <section className="registry-onboarding-note">
          <Building2 size={22} />
          <div>
            <strong>Create the first office before onboarding employees or assets.</strong>
            <p>Office codes become part of permanent employee IDs and asset tags.</p>
          </div>
          <button type="button" onClick={() => openOfficeForm()}>
            <Plus size={15} /> Add first office
          </button>
        </section>
      )}

      {(error || notice) && (
        <div className={`registry-message ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
          {error ? <CircleAlert size={18} /> : <Check size={18} />}
          <span>{error || notice}</span>
          <button type="button" onClick={() => (error ? setError("") : setNotice(""))}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="registry-workspace">
        <div className="registry-tabs" role="tablist" aria-label="Registry views">
          {[
            ["employees", "Employees", UsersRound],
            ["offices", "Offices", Building2],
            ["assets", "Assets", PackageCheck],
            ["issues", "Issues & maintenance", Wrench],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeView === key}
              className={activeView === key ? "active" : ""}
              onClick={() => {
                setActiveView(key);
                setSearch("");
                setStatusFilter("All");
              }}
            >
              <Icon size={16} /> {label}<span>{viewCount[key]}</span>
            </button>
          ))}
        </div>

        <div className="registry-toolbar">
          <label className="registry-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeView}…`}
            />
          </label>
          {activeView !== "offices" && (
            <label className="registry-filter">
              <MapPin size={16} />
              <select value={officeFilter} onChange={(event) => setOfficeFilter(event.target.value)}>
                <option value="All">All offices</option>
                {offices.map((office) => (
                  <option value={getId(office)} key={getId(office)}>
                    {office.code} · {office.city}
                  </option>
                ))}
              </select>
            </label>
          )}
          {["employees", "assets", "issues"].includes(activeView) && (
            <label className="registry-filter">
              <Filter size={16} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="All">All statuses</option>
                {activeView === "employees" &&
                  EMPLOYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                {activeView === "assets" &&
                  ["Unassigned", "Assigned", "Retired", "Bike", "Laptop", "Tablet"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                {activeView === "issues" &&
                  ["Reported", "In Progress", "Resolved", "Closed"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
              </select>
            </label>
          )}
          <span className="registry-updated">
            Updated {lastUpdated ? lastUpdated.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </span>
          <button
            type="button"
            className="registry-button primary compact"
            onClick={() =>
              activeView === "employees"
                ? openEmployeeForm()
                : activeView === "offices"
                  ? openOfficeForm()
                  : activeView === "assets"
                    ? openAssetForm()
                    : openIssueForm()
            }
            disabled={activeView !== "offices" && !offices.length}
          >
            <Plus size={15} /> Add {activeView === "issues" ? "record" : activeView.slice(0, -1)}
          </button>
        </div>

        {activeView === "employees" && (
          <div className={`employee-workspace ${selectedEmployeeId ? "has-profile" : ""}`}>
            <div className="employee-directory">
              {filteredEmployees.length ? (
                filteredEmployees.map((employee) => {
                  const active = selectedEmployeeId === getId(employee);
                  const documentCount = Object.values(employee.documentStatus || {}).filter(
                    (value) => value === true
                  ).length;
                  return (
                    <article
                      className={`employee-row ${active ? "selected" : ""}`}
                      key={getId(employee)}
                      onClick={() => loadEmployeeDetail(getId(employee))}
                    >
                      <div className="employee-avatar">
                        {employee.profilePhoto?.url ? (
                          <img src={employee.profilePhoto.url} alt="" />
                        ) : (
                          <span>{initials(employee.fullName)}</span>
                        )}
                        <i className={employee.employmentStatus === "Active" ? "active" : ""} />
                      </div>
                      <div className="employee-primary">
                        <span>{employee.employeeCode || "Code pending"}</span>
                        <strong>{employee.fullName}</strong>
                        <p>{employee.designation || "Designation pending"} · {employee.department || "Department pending"}</p>
                      </div>
                      <div className="employee-office">
                        <Building2 size={15} />
                        <span><strong>{employee.office?.code || "—"}</strong>{employee.office?.city || "No office"}</span>
                      </div>
                      <div className="employee-verification">
                        <span className={documentCount >= 3 ? "verified" : ""}>
                          {documentCount >= 3 ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                          {documentCount >= 3 ? "Identity ready" : `${documentCount}/3 identity files`}
                        </span>
                        <small>{employee.cnic || "CNIC pending"}</small>
                      </div>
                      <span className={`status-chip ${employee.employmentStatus?.toLowerCase().replace(/\s/g, "-")}`}>
                        {employee.employmentStatus}
                      </span>
                      <ChevronRight size={18} />
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  icon={UsersRound}
                  title="No employee records found"
                  text={search ? "Try a different name, ID, office, or status." : "Add an employee to begin the digital directory."}
                  action="Add employee"
                  onAction={() => openEmployeeForm()}
                />
              )}
            </div>

            {selectedEmployeeId && (
              <aside className="employee-profile">
                <button
                  type="button"
                  className="profile-close"
                  onClick={() => {
                    setSelectedEmployeeId("");
                    setSelectedEmployee(null);
                  }}
                  aria-label="Close employee profile"
                >
                  <X size={18} />
                </button>
                {detailLoading || !selectedEmployee ? (
                  <div className="profile-loading"><RefreshCw className="spin" size={20} /> Loading profile…</div>
                ) : (
                  <>
                    <div className="profile-identity">
                      <div className="profile-photo">
                        {selectedEmployee.profilePhoto?.url ? (
                          <img src={selectedEmployee.profilePhoto.url} alt={selectedEmployee.fullName} />
                        ) : (
                          <span>{initials(selectedEmployee.fullName)}</span>
                        )}
                      </div>
                      <p>{selectedEmployee.employeeCode}</p>
                      <h2>{selectedEmployee.fullName}</h2>
                      <span>{selectedEmployee.designation} · {selectedEmployee.department}</span>
                      <div>
                        <button type="button" onClick={() => openEmployeeForm(selectedEmployee)}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferDraft({
                              targetType: "employee",
                              targetId: getId(selectedEmployee),
                              officeId: "",
                              reason: "",
                            });
                            setModal({ type: "transfer" });
                          }}
                        >
                          <MapPin size={14} /> Transfer
                        </button>
                        {isCEO && (
                          <button
                            type="button"
                            className="danger"
                            aria-label={`Delete ${selectedEmployee.fullName}`}
                            onClick={() => deleteRecord("employee", getId(selectedEmployee))}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="profile-contact-grid">
                      <span><Building2 size={15} /><small>Office</small><strong>{selectedEmployee.office?.name || "—"}</strong></span>
                      <span><CalendarDays size={15} /><small>Joined</small><strong>{formatDate(selectedEmployee.joiningDate)}</strong></span>
                      <span><Phone size={15} /><small>Phone</small><strong>{selectedEmployee.phone || "—"}</strong></span>
                      <span><Mail size={15} /><small>Email</small><strong>{selectedEmployee.email || "—"}</strong></span>
                    </div>

                    <section className="profile-section">
                      <div className="profile-section-head">
                        <div><small>Private identity</small><h3>Verified documents</h3></div>
                        <span><ShieldCheck size={14} /> Access logged</span>
                      </div>
                      <div className="document-list">
                        {[
                          ["cnicFront", "CNIC front", IdCard],
                          ["cnicBack", "CNIC back", IdCard],
                          ["contractDocument", "Employment contract", FileText],
                          ["billProof", "Address proof", FileCheck2],
                        ].map(([type, label, Icon]) => (
                          <button
                            type="button"
                            key={type}
                            disabled={!selectedEmployee[type]?.available}
                            onClick={() => accessDocument(type)}
                          >
                            <Icon size={17} />
                            <span><strong>{label}</strong><small>{selectedEmployee[type]?.available ? "Verified file" : "Not uploaded"}</small></span>
                            {selectedEmployee[type]?.available ? <ArrowRight size={15} /> : <Clock3 size={15} />}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="profile-section">
                      <div className="profile-section-head">
                        <div><small>Company property</small><h3>Current equipment</h3></div>
                        <button
                          type="button"
                          className="mini-action"
                          disabled={!availableAssets.length}
                          onClick={() => {
                            setAssignmentDraft({
                              employeeId: getId(selectedEmployee),
                              assetId: "",
                              issueCondition: "Good",
                              issueNotes: "",
                            });
                            setModal({ type: "assignment" });
                          }}
                        >
                          <Plus size={14} /> Assign
                        </button>
                      </div>
                      <div className="profile-assets">
                        {(selectedEmployee.currentAssets || []).length ? (
                          selectedEmployee.currentAssets.map((asset) => {
                            const Icon = assetIcon(asset.itemType);
                            return (
                              <article key={getId(asset)}>
                                <span><Icon size={17} /></span>
                                <div><strong>{asset.brandModel}</strong><small>{asset.assetTag} · {asset.conditionStatus}</small></div>
                                <button type="button" onClick={() => returnAsset(asset)} title="Return asset"><Undo2 size={15} /></button>
                              </article>
                            );
                          })
                        ) : (
                          <p className="profile-empty">No company property currently assigned.</p>
                        )}
                      </div>
                    </section>

                    <section className="profile-section timeline-section">
                      <div className="profile-section-head">
                        <div><small>Permanent audit trail</small><h3>Recent activity</h3></div>
                      </div>
                      <div className="profile-timeline">
                        {(selectedEmployee.activityHistory || []).slice().reverse().slice(0, 8).map((activity) => (
                          <article key={activity._id}>
                            <i />
                            <div><strong>{activity.label}</strong><small>{formatDate(activity.occurredAt)}</small></div>
                          </article>
                        ))}
                        {!selectedEmployee.activityHistory?.length && <p className="profile-empty">No recorded activity yet.</p>}
                      </div>
                    </section>
                  </>
                )}
              </aside>
            )}
          </div>
        )}

        {activeView === "offices" && (
          <div className="office-grid">
            {filteredOffices.length ? (
              filteredOffices.map((office) => (
                <article className="office-card" key={getId(office)}>
                  <div className="office-card-top">
                    <span><Building2 size={21} /></span>
                    <i className={office.status === "Active" ? "active" : ""}>{office.status}</i>
                  </div>
                  <p>{office.code}</p>
                  <h2>{office.name}</h2>
                  <span className="office-city"><MapPin size={14} /> {office.city}</span>
                  <p className="office-address">{office.address}</p>
                  <div className="office-counts">
                    <span><strong>{office.employeeCount || 0}</strong><small>Employees</small></span>
                    <span><strong>{office.assetCount || 0}</strong><small>Assets</small></span>
                  </div>
                  <div className="office-manager">
                    <UserRound size={15} />
                    <span><small>Office manager</small><strong>{office.managerName || "Not assigned"}</strong></span>
                  </div>
                  <footer>
                    <button type="button" onClick={() => openOfficeForm(office)}><Pencil size={14} /> Edit office</button>
                    {isCEO && (
                      <button type="button" className="danger" aria-label={`Delete ${office.name}`} onClick={() => deleteRecord("office", getId(office))}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </footer>
                </article>
              ))
            ) : (
              <EmptyState icon={Building2} title="No offices found" text="Create a city office to organize employees and inventory." action="Add office" onAction={() => openOfficeForm()} />
            )}
          </div>
        )}

        {activeView === "assets" && (
          <div className="asset-grid">
            {filteredAssets.length ? (
              filteredAssets.map((asset) => {
                const Icon = assetIcon(asset.itemType);
                const issueCount = issues.filter((issue) => getId(issue.asset) === getId(asset) && isOpenIssue(issue)).length;
                return (
                  <article className="asset-card" key={getId(asset)}>
                    <div className="asset-card-head">
                      <span><Icon size={21} /></span>
                      <div><small>{asset.itemType}</small><strong>{asset.assetTag}</strong></div>
                      <i className={asset.assignmentStatus?.toLowerCase()}>{asset.assignmentStatus === "Unassigned" ? "Available" : asset.assignmentStatus}</i>
                    </div>
                    <h2>{asset.brandModel}</h2>
                    <p>{asset.serialNumber || asset.bikeDetails?.registrationNumber || "No serial number"}</p>
                    <div className="asset-facts">
                      <span><Building2 size={14} /> {asset.office?.code || "No office"}</span>
                      <span><ShieldCheck size={14} /> {asset.conditionStatus}</span>
                      {asset.purchasePrice ? <span><FileText size={14} /> {money(asset.purchasePrice)}</span> : null}
                      {asset.itemType === "Bike" && <span><Bike size={14} /> {asset.bikeDetails?.currentMileage || 0} km</span>}
                    </div>
                    {asset.assignedEmployee ? (
                      <div className="asset-assignee">
                        <span>{initials(asset.assignedEmployee.fullName)}</span>
                        <div><small>In custody of</small><strong>{asset.assignedEmployee.fullName}</strong></div>
                      </div>
                    ) : (
                      <div className="asset-assignee available"><PackageCheck size={17} /><div><small>Inventory status</small><strong>{asset.lifecycleStatus}</strong></div></div>
                    )}
                    <footer>
                      <button type="button" onClick={() => openAssetForm(asset)}><Pencil size={14} /> Edit</button>
                      <button type="button" onClick={() => {
                        setIssueDraft({ ...EMPTY_ISSUE, assetId: getId(asset) });
                        setModal({ type: "issue", id: "" });
                      }}>
                        <Wrench size={14} /> {issueCount ? `${issueCount} open` : "Report"}
                      </button>
                      {!asset.assignedEmployee && (
                        <button type="button" onClick={() => {
                          setTransferDraft({ targetType: "asset", targetId: getId(asset), officeId: "", reason: "" });
                          setModal({ type: "transfer" });
                        }} aria-label={`Transfer ${asset.assetTag}`}><MapPin size={14} /></button>
                      )}
                      {isCEO && !asset.assignedEmployee && (
                        <button type="button" className="danger" aria-label={`Delete ${asset.assetTag}`} onClick={() => deleteRecord("asset", getId(asset))}><Trash2 size={14} /></button>
                      )}
                    </footer>
                  </article>
                );
              })
            ) : (
              <EmptyState icon={PackageCheck} title="No assets found" text="Register laptops, bikes, tablets, or other company property." action="Register asset" onAction={() => openAssetForm()} />
            )}
          </div>
        )}

        {activeView === "issues" && (
          <div className="issue-list">
            {filteredIssues.length ? (
              filteredIssues.map((issue) => (
                <article className="issue-row" key={getId(issue)}>
                  <span className={`issue-severity ${issue.severity?.toLowerCase()}`}><AlertTriangle size={17} /></span>
                  <div className="issue-main">
                    <p>{issue.type} · {issue.asset?.assetTag}</p>
                    <strong>{issue.title}</strong>
                    <span>{issue.description || "No additional description"}</span>
                  </div>
                  <div className="issue-office"><Building2 size={14} /><span><strong>{issue.office?.code || "—"}</strong>{issue.office?.city || "Unknown office"}</span></div>
                  <div className="issue-cost"><small>Recorded cost</small><strong>{money(issue.cost)}</strong></div>
                  <span className={`issue-status ${issue.status?.toLowerCase().replace(/\s/g, "-")}`}>{issue.status}</span>
                  <div className="issue-actions">
                    <button type="button" aria-label={`Edit ${issue.title}`} onClick={() => openIssueForm(issue)}><Pencil size={15} /></button>
                    {isCEO && <button type="button" className="danger" aria-label={`Delete ${issue.title}`} onClick={() => deleteRecord("issue", getId(issue))}><Trash2 size={15} /></button>}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState icon={Wrench} title="No issue records found" text="Report repairs, accidents, fines, claims, or maintenance expenses." action="Report issue" onAction={() => openIssueForm()} />
            )}
          </div>
        )}
      </section>

      {modal?.type === "employee" && (
        <ModalLayer close={closeModal} wide>
          <div className="onboarding-head">
            <div><p><UserRound size={14} /> Employee onboarding</p><h2>{modal.id ? "Update employee profile" : "Create a verified employee record"}</h2></div>
            <button type="button" onClick={closeModal}><X size={19} /></button>
          </div>
          <div className="onboarding-stepper">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <button
                  type="button"
                  key={step.title}
                  className={`${employeeStep === index ? "active" : ""} ${employeeStep > index ? "complete" : ""}`}
                  onClick={() => index < employeeStep && setEmployeeStep(index)}
                >
                  <span>{employeeStep > index ? <Check size={16} /> : <Icon size={16} />}</span>
                  <div><small>Step {index + 1}</small><strong>{step.title}</strong><p>{step.hint}</p></div>
                </button>
              );
            })}
          </div>
          <form className="onboarding-form" onSubmit={employeeSubmit} noValidate>
            {employeeSubmitError && (
              <div className="employee-form-alert submit-error" role="alert">
                <CircleAlert size={18} />
                <div>
                  <strong>The employee could not be saved</strong>
                  <p>{employeeSubmitError} Your entered information is still here.</p>
                </div>
              </div>
            )}
            {Object.keys(currentEmployeeStepErrors).length > 0 && (
              <div className="employee-form-alert validation-error" role="alert">
                <AlertTriangle size={18} />
                <div>
                  <strong>
                    Complete {Object.keys(currentEmployeeStepErrors).length} required{" "}
                    {Object.keys(currentEmployeeStepErrors).length === 1
                      ? "item"
                      : "items"}{" "}
                    before continuing
                  </strong>
                  <ul>
                    {Object.entries(currentEmployeeStepErrors).map(
                      ([field, message]) => <li key={field}>{message}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
            {employeeStep === 0 && (
              <div className="form-stage">
                <div className="stage-copy"><span>01</span><div><h3>Identity &amp; contact</h3><p>Create a recognizable, searchable employee identity.</p></div></div>
                <div className="identity-form-layout">
                  <label
                    className={`photo-upload ${currentEmployeeStepErrors.profilePhoto ? "field-error" : ""}`}
                    data-employee-invalid={Boolean(currentEmployeeStepErrors.profilePhoto)}
                  >
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                      const file = event.target.files?.[0];
                      setEmployeeFiles((current) => ({ ...current, profilePhoto: file }));
                      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
                      if (file) setPhotoPreview(URL.createObjectURL(file));
                    }} />
                    <span className="photo-preview">
                      {photoPreview ? <img src={photoPreview} alt="Employee preview" /> : <Camera size={25} />}
                    </span>
                    <strong>Profile photograph *</strong>
                    <small>Required before activation</small>
                    {currentEmployeeStepErrors.profilePhoto && (
                      <small className="field-error-text">
                        {currentEmployeeStepErrors.profilePhoto}
                      </small>
                    )}
                  </label>
                  <div className="registry-form-grid">
                    <Field label="Full name *" name="fullName" error={currentEmployeeStepErrors.fullName} wide><input required autoFocus value={employeeDraft.fullName} onChange={(e) => setEmployeeDraft((c) => ({ ...c, fullName: e.target.value }))} placeholder="Employee’s legal name" /></Field>
                    <Field label="CNIC number *" name="cnic" error={currentEmployeeStepErrors.cnic}><input required value={employeeDraft.cnic} onChange={(e) => setEmployeeDraft((c) => ({ ...c, cnic: formatCnicInput(e.target.value) }))} placeholder="35201-1234567-1" maxLength={15} /></Field>
                    <Field label="Phone number *" name="phone" error={currentEmployeeStepErrors.phone}><input required value={employeeDraft.phone} onChange={(e) => setEmployeeDraft((c) => ({ ...c, phone: e.target.value }))} placeholder="0300-1234567" /></Field>
                    <Field label="Email address *" name="email" error={currentEmployeeStepErrors.email}><input required type="email" value={employeeDraft.email} onChange={(e) => setEmployeeDraft((c) => ({ ...c, email: e.target.value }))} placeholder="name@neesmedical.com" /></Field>
                    <Field label="Residential address *" name="currentAddress" error={currentEmployeeStepErrors.currentAddress} wide><textarea required rows={3} value={employeeDraft.currentAddress} onChange={(e) => setEmployeeDraft((c) => ({ ...c, currentAddress: e.target.value }))} placeholder="House, street, area, city" /></Field>
                    <div className="form-divider wide"><span>Emergency contact</span><small>Who should the company call first?</small></div>
                    <Field label="Contact name *" name="emergencyName" error={currentEmployeeStepErrors.emergencyName}><input required value={employeeDraft.emergencyContact.name} onChange={(e) => setEmployeeDraft((c) => ({ ...c, emergencyContact: { ...c.emergencyContact, name: e.target.value } }))} /></Field>
                    <Field label="Relationship"><input value={employeeDraft.emergencyContact.relationship} onChange={(e) => setEmployeeDraft((c) => ({ ...c, emergencyContact: { ...c.emergencyContact, relationship: e.target.value } }))} placeholder="Parent, sibling, spouse" /></Field>
                    <Field label="Emergency phone *" name="emergencyPhone" error={currentEmployeeStepErrors.emergencyPhone} wide><input required value={employeeDraft.emergencyContact.phone} onChange={(e) => setEmployeeDraft((c) => ({ ...c, emergencyContact: { ...c.emergencyContact, phone: e.target.value } }))} /></Field>
                  </div>
                </div>
              </div>
            )}

            {employeeStep === 1 && (
              <div className="form-stage">
                <div className="stage-copy"><span>02</span><div><h3>Employment placement</h3><p>Place the employee in the correct city, team, and role.</p></div></div>
                <div className="registry-form-grid">
                  <Field label="Assigned office *" name="office" error={currentEmployeeStepErrors.office} wide>
                    <select required value={employeeDraft.office} onChange={(e) => setEmployeeDraft((c) => ({ ...c, office: e.target.value }))}>
                      <option value="">Choose office…</option>
                      {offices.filter((office) => office.status === "Active").map((office) => <option key={getId(office)} value={getId(office)}>{office.code} · {office.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Department *" name="department" error={currentEmployeeStepErrors.department}><input required value={employeeDraft.department} onChange={(e) => setEmployeeDraft((c) => ({ ...c, department: e.target.value }))} placeholder="Operations" /></Field>
                  <Field label="Designation *" name="designation" error={currentEmployeeStepErrors.designation}><input required value={employeeDraft.designation} onChange={(e) => setEmployeeDraft((c) => ({ ...c, designation: e.target.value }))} placeholder="Coordinator" /></Field>
                  <Field label="Joining date *" name="joiningDate" error={currentEmployeeStepErrors.joiningDate}><input required type="date" value={employeeDraft.joiningDate} onChange={(e) => setEmployeeDraft((c) => ({ ...c, joiningDate: e.target.value }))} /></Field>
                  <Field label="Record status">
                    <select value={employeeDraft.employmentStatus} onChange={(e) => setEmployeeDraft((c) => ({ ...c, employmentStatus: e.target.value }))}>
                      {EMPLOYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </Field>
                </div>
                {selectedOffice && (
                  <div className="selected-office-card"><Building2 size={19} /><div><small>{selectedOffice.code} · {selectedOffice.city}</small><strong>{selectedOffice.name}</strong><p>{selectedOffice.address}</p></div></div>
                )}
              </div>
            )}

            {employeeStep === 2 && (
              <div className="form-stage">
                <div className="stage-copy"><span>03</span><div><h3>Private documents</h3><p>Identity files are protected and never shown in directory tables.</p></div></div>
                <div className="document-upload-grid">
                  <DocumentUpload label="CNIC front *" type="cnicFront" file={employeeFiles.cnicFront} ready={existingDocumentStatus.cnicFront} setFiles={setEmployeeFiles} error={currentEmployeeStepErrors.cnicFront} />
                  <DocumentUpload label="CNIC back *" type="cnicBack" file={employeeFiles.cnicBack} ready={existingDocumentStatus.cnicBack} setFiles={setEmployeeFiles} error={currentEmployeeStepErrors.cnicBack} />
                  <DocumentUpload label="Employment contract" type="contractDocument" file={employeeFiles.contractDocument} ready={existingDocumentStatus.contractDocument} setFiles={setEmployeeFiles} />
                  <DocumentUpload label="Address proof" type="billProof" file={employeeFiles.billProof} ready={existingDocumentStatus.billProof} setFiles={setEmployeeFiles} />
                  <DocumentUpload label="Supporting document" type="supportingDocument" file={employeeFiles.supportingDocument} ready={existingDocumentStatus.supportingDocuments > 0} setFiles={setEmployeeFiles} />
                </div>
                <div className="privacy-note"><ShieldCheck size={19} /><div><strong>Protected identity storage</strong><p>CNIC and contract files use authenticated Cloudinary storage. Every view or download is added to the employee activity trail.</p></div></div>
              </div>
            )}

            {employeeStep === 3 && (
              <div className="form-stage review-stage">
                <div className="stage-copy"><span>04</span><div><h3>Review &amp; activate</h3><p>Confirm the employee identity before creating the permanent record.</p></div></div>
                <div className="employee-review-card">
                  <div className="review-person">
                    <span>{photoPreview ? <img src={photoPreview} alt="" /> : initials(employeeDraft.fullName)}</span>
                    <div><small>{selectedOffice?.code || "OFFICE"} · Employee ID generated on save</small><h3>{employeeDraft.fullName || "Employee name"}</h3><p>{employeeDraft.designation || "Designation"} · {employeeDraft.department || "Department"}</p></div>
                    <i className={employeeDraft.employmentStatus === "Active" ? "active" : ""}>{employeeDraft.employmentStatus}</i>
                  </div>
                  <div className="review-facts">
                    <span><IdCard size={15} /><small>CNIC</small><strong>{employeeDraft.cnic || "Missing"}</strong></span>
                    <span><Building2 size={15} /><small>Office</small><strong>{selectedOffice?.name || "Missing"}</strong></span>
                    <span><CalendarDays size={15} /><small>Joining</small><strong>{formatDate(employeeDraft.joiningDate)}</strong></span>
                    <span><Phone size={15} /><small>Emergency</small><strong>{employeeDraft.emergencyContact.name || "Missing"}</strong></span>
                  </div>
                </div>
                <div className="activation-checklist">
                  {[
                    ["Profile photograph", documentReady("profilePhoto")],
                    ["CNIC front image", documentReady("cnicFront")],
                    ["CNIC back image", documentReady("cnicBack")],
                  ].map(([label, ready]) => <span className={ready ? "ready" : ""} key={label}>{ready ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}{label}</span>)}
                </div>
                {employeeDraft.employmentStatus === "Active" && !activationReady && (
                  <div className="activation-warning"><AlertTriangle size={17} /> Active status requires the photograph and both CNIC images. Return to Documents or save as Draft.</div>
                )}
              </div>
            )}

            <footer className="onboarding-footer">
              <button type="button" className="registry-button ghost dark" onClick={employeeStep ? () => setEmployeeStep((step) => step - 1) : closeModal}>
                {employeeStep ? <ArrowLeft size={16} /> : null}{employeeStep ? "Previous" : "Cancel"}
              </button>
              <span>Step {employeeStep + 1} of {STEPS.length}</span>
              <button type="submit" className="registry-button primary" disabled={saving || (employeeStep === 3 && employeeDraft.employmentStatus === "Active" && !activationReady)}>
                {saving ? "Saving…" : employeeStep < 3 ? <>Continue <ArrowRight size={16} /></> : modal.id ? "Save employee" : employeeDraft.employmentStatus === "Draft" ? "Save draft" : "Activate employee"}
              </button>
            </footer>
          </form>
        </ModalLayer>
      )}

      {modal?.type === "office" && (
        <ModalLayer close={closeModal}>
          <ModalHead icon={Building2} eyebrow="Office directory" title={modal.id ? "Update office" : "Add a company office"} close={closeModal} />
          <form className="simple-modal-form" onSubmit={saveOffice}>
            <div className="registry-form-grid">
              <Field label="Office name *" wide><input required autoFocus value={officeDraft.name} onChange={(e) => setOfficeDraft((c) => ({ ...c, name: e.target.value }))} placeholder="NEES Lahore Office" /></Field>
              <Field label="Office code *"><input required value={officeDraft.code} onChange={(e) => setOfficeDraft((c) => ({ ...c, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) }))} placeholder="LHR" /></Field>
              <Field label="City *"><input required value={officeDraft.city} onChange={(e) => setOfficeDraft((c) => ({ ...c, city: e.target.value }))} placeholder="Lahore" /></Field>
              <Field label="Complete address *" wide><textarea required rows={3} value={officeDraft.address} onChange={(e) => setOfficeDraft((c) => ({ ...c, address: e.target.value }))} /></Field>
              <Field label="Office manager"><input value={officeDraft.managerName} onChange={(e) => setOfficeDraft((c) => ({ ...c, managerName: e.target.value }))} /></Field>
              <Field label="Contact number"><input value={officeDraft.phone} onChange={(e) => setOfficeDraft((c) => ({ ...c, phone: e.target.value }))} /></Field>
              <Field label="Status" wide><select value={officeDraft.status} onChange={(e) => setOfficeDraft((c) => ({ ...c, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></Field>
            </div>
            <ModalFooter close={closeModal} saving={saving} label={modal.id ? "Save office" : "Add office"} />
          </form>
        </ModalLayer>
      )}

      {modal?.type === "asset" && (
        <ModalLayer close={closeModal} wide>
          <ModalHead icon={PackageCheck} eyebrow="Company property" title={modal.id ? "Update asset record" : "Register a company asset"} close={closeModal} />
          <form className="simple-modal-form asset-form" onSubmit={saveAsset}>
            <div className="registry-form-grid">
              <Field label="Asset tag *"><input required autoFocus value={assetDraft.assetTag} onChange={(e) => setAssetDraft((c) => ({ ...c, assetTag: e.target.value.toUpperCase() }))} placeholder="LHR-LAP-0012" /></Field>
              <Field label="Category *"><select value={assetDraft.itemType} onChange={(e) => setAssetDraft((c) => ({ ...c, itemType: e.target.value }))}>{ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Brand & model *" wide><input required value={assetDraft.brandModel} onChange={(e) => setAssetDraft((c) => ({ ...c, brandModel: e.target.value }))} placeholder="Lenovo ThinkPad E14" /></Field>
              <Field label="Serial number"><input value={assetDraft.serialNumber} onChange={(e) => setAssetDraft((c) => ({ ...c, serialNumber: e.target.value.toUpperCase() }))} /></Field>
              <Field label="Owning office *"><select required value={assetDraft.office} onChange={(e) => setAssetDraft((c) => ({ ...c, office: e.target.value }))}><option value="">Choose office…</option>{offices.filter((office) => office.status === "Active").map((office) => <option key={getId(office)} value={getId(office)}>{office.code} · {office.name}</option>)}</select></Field>
              <Field label="Condition"><select value={assetDraft.conditionStatus} onChange={(e) => setAssetDraft((c) => ({ ...c, conditionStatus: e.target.value }))}>{CONDITION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
              <Field label="Lifecycle stage"><select value={assetDraft.lifecycleStatus} onChange={(e) => setAssetDraft((c) => ({ ...c, lifecycleStatus: e.target.value }))}>{LIFECYCLE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
              {assetDraft.itemType === "Bike" ? (
                <>
                  <div className="form-divider wide bike-divider"><span><Bike size={15} /> Bike identity &amp; service</span><small>Registration, insurance, mileage, and issued safety equipment</small></div>
                  {[
                    ["manufacturingYear", "Manufacturing year", "number"],
                    ["registrationNumber", "Registration number *", "text"],
                    ["engineNumber", "Engine number *", "text"],
                    ["chassisNumber", "Chassis number *", "text"],
                    ["color", "Colour", "text"],
                    ["currentMileage", "Current mileage (km)", "number"],
                  ].map(([key, label, type]) => <Field label={label} key={key}><input required={label.includes("*")} type={type} value={assetDraft.bikeDetails[key]} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, [key]: e.target.value } }))} /></Field>)}
                  <Field label="Fuel type"><select value={assetDraft.bikeDetails.fuelType} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, fuelType: e.target.value } }))}><option>Petrol</option><option>Electric</option><option>Hybrid</option><option>Other</option></select></Field>
                  <Field label="Insurance expiry"><input type="date" value={assetDraft.bikeDetails.insuranceExpiresAt} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, insuranceExpiresAt: e.target.value } }))} /></Field>
                  <Field label="Registration document"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setAssetFiles((c) => ({ ...c, registration: e.target.files?.[0] }))} /></Field>
                  <Field label="Insurance document"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setAssetFiles((c) => ({ ...c, insurance: e.target.files?.[0] }))} /></Field>
                  <Field label="Keys issued"><input type="number" min="0" value={assetDraft.bikeDetails.keysIssued} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, keysIssued: e.target.value } }))} /></Field>
                  <Field label="Helmet issued"><label className="checkbox-field"><input type="checkbox" checked={assetDraft.bikeDetails.helmetIssued} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, helmetIssued: e.target.checked } }))} /><span>Company helmet included</span></label></Field>
                  <Field label="Accessories" wide><input value={assetDraft.bikeDetails.accessoriesIssued} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, accessoriesIssued: e.target.value } }))} placeholder="Helmet, lock, rain cover" /></Field>
                  <Field label="Last service"><input type="date" value={assetDraft.bikeDetails.lastServiceDate} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, lastServiceDate: e.target.value } }))} /></Field>
                  <Field label="Next service date"><input type="date" value={assetDraft.bikeDetails.nextServiceDate} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, nextServiceDate: e.target.value } }))} /></Field>
                  <Field label="Next service mileage" wide><input type="number" min="0" value={assetDraft.bikeDetails.nextServiceMileage} onChange={(e) => setAssetDraft((c) => ({ ...c, bikeDetails: { ...c.bikeDetails, nextServiceMileage: e.target.value } }))} /></Field>
                </>
              ) : (
                <>
                  <div className="form-divider wide"><span>Technical details</span><small>Optional specifications for issuing and servicing</small></div>
                  {[
                    ["processor", "Processor"],
                    ["ram", "Memory / RAM"],
                    ["storage", "Storage"],
                    ["operatingSystem", "Operating system"],
                  ].map(([key, label]) => <Field label={label} key={key}><input value={assetDraft.specs[key]} onChange={(e) => setAssetDraft((c) => ({ ...c, specs: { ...c.specs, [key]: e.target.value } }))} /></Field>)}
                  <Field label="Notes" wide><textarea rows={2} value={assetDraft.specs.notes} onChange={(e) => setAssetDraft((c) => ({ ...c, specs: { ...c.specs, notes: e.target.value } }))} /></Field>
                </>
              )}
              <div className="form-divider wide"><span>Photographs &amp; invoice</span><small>Capture visual condition and proof of purchase</small></div>
              <Field label="Asset photograph"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setAssetFiles((c) => ({ ...c, photo: e.target.files?.[0] }))} /></Field>
              <Field label="Invoice / registration document"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setAssetFiles((c) => ({ ...c, invoice: e.target.files?.[0] }))} /></Field>
            </div>
            <ModalFooter close={closeModal} saving={saving} label={modal.id ? "Save asset" : "Register asset"} />
          </form>
        </ModalLayer>
      )}

      {modal?.type === "issue" && (
        <ModalLayer close={closeModal}>
          <ModalHead icon={Wrench} eyebrow="Lifecycle record" title={modal.id ? "Update issue or maintenance" : "Report an asset event"} close={closeModal} />
          <form className="simple-modal-form" onSubmit={saveIssue}>
            <div className="registry-form-grid">
              <Field label="Asset *" wide><select required disabled={Boolean(modal.id)} value={issueDraft.assetId} onChange={(e) => setIssueDraft((c) => ({ ...c, assetId: e.target.value }))}><option value="">Choose asset…</option>{assets.map((asset) => <option key={getId(asset)} value={getId(asset)}>{asset.assetTag} · {asset.brandModel}</option>)}</select></Field>
              <Field label="Record type"><select value={issueDraft.type} onChange={(e) => setIssueDraft((c) => ({ ...c, type: e.target.value }))}>{ISSUE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Severity"><select value={issueDraft.severity} onChange={(e) => setIssueDraft((c) => ({ ...c, severity: e.target.value }))}>{["Low", "Medium", "High", "Critical"].map((severity) => <option key={severity}>{severity}</option>)}</select></Field>
              <Field label="Title *" wide><input required autoFocus value={issueDraft.title} onChange={(e) => setIssueDraft((c) => ({ ...c, title: e.target.value }))} placeholder="Describe the issue briefly" /></Field>
              <Field label="Description" wide><textarea rows={3} value={issueDraft.description} onChange={(e) => setIssueDraft((c) => ({ ...c, description: e.target.value }))} /></Field>
              <Field label="Reported by employee"><select value={issueDraft.reportedByEmployeeId} onChange={(e) => setIssueDraft((c) => ({ ...c, reportedByEmployeeId: e.target.value }))}><option value="">Company / office report</option>{employees.map((employee) => <option key={getId(employee)} value={getId(employee)}>{employee.employeeCode} · {employee.fullName}</option>)}</select></Field>
              <Field label="Status"><select value={issueDraft.status} onChange={(e) => setIssueDraft((c) => ({ ...c, status: e.target.value }))}>{["Reported", "In Progress", "Resolved", "Closed"].map((status) => <option key={status}>{status}</option>)}</select></Field>
              <Field label="Vendor / workshop"><input value={issueDraft.vendor} onChange={(e) => setIssueDraft((c) => ({ ...c, vendor: e.target.value }))} /></Field>
              <Field label="Expense"><input type="number" min="0" value={issueDraft.cost} onChange={(e) => setIssueDraft((c) => ({ ...c, cost: e.target.value }))} /></Field>
              <Field label="Resolution" wide><textarea rows={2} value={issueDraft.resolution} onChange={(e) => setIssueDraft((c) => ({ ...c, resolution: e.target.value }))} /></Field>
              <Field label="Next service date"><input type="date" value={issueDraft.nextServiceDate} onChange={(e) => setIssueDraft((c) => ({ ...c, nextServiceDate: e.target.value }))} /></Field>
              <Field label="Next service mileage"><input type="number" min="0" value={issueDraft.nextServiceMileage} onChange={(e) => setIssueDraft((c) => ({ ...c, nextServiceMileage: e.target.value }))} /></Field>
            </div>
            <ModalFooter close={closeModal} saving={saving} label={modal.id ? "Save record" : "Add lifecycle record"} />
          </form>
        </ModalLayer>
      )}

      {modal?.type === "assignment" && (
        <ModalLayer close={closeModal}>
          <ModalHead icon={ClipboardCheck} eyebrow="Chain of custody" title="Issue company property" close={closeModal} />
          <form className="simple-modal-form" onSubmit={saveAssignment}>
            <div className="assignment-flow">
              <Field label="Employee"><select required value={assignmentDraft.employeeId} onChange={(e) => setAssignmentDraft((c) => ({ ...c, employeeId: e.target.value }))}><option value="">Choose employee…</option>{employees.filter((employee) => employee.employmentStatus === "Active").map((employee) => <option key={getId(employee)} value={getId(employee)}>{employee.employeeCode} · {employee.fullName}</option>)}</select></Field>
              <ChevronRight size={19} />
              <Field label="Available asset"><select required value={assignmentDraft.assetId} onChange={(e) => setAssignmentDraft((c) => ({ ...c, assetId: e.target.value }))}><option value="">Choose asset…</option>{availableAssets.filter((asset) => !assignmentDraft.employeeId || getId(asset.office) === getId(employeeMap.get(assignmentDraft.employeeId)?.office)).map((asset) => <option key={getId(asset)} value={getId(asset)}>{asset.assetTag} · {asset.brandModel}</option>)}</select></Field>
            </div>
            <div className="registry-form-grid">
              <Field label="Condition when issued"><select value={assignmentDraft.issueCondition} onChange={(e) => setAssignmentDraft((c) => ({ ...c, issueCondition: e.target.value }))}>{CONDITION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
              <Field label="Accessories / issue notes"><input value={assignmentDraft.issueNotes} onChange={(e) => setAssignmentDraft((c) => ({ ...c, issueNotes: e.target.value }))} placeholder="Charger, keys, helmet…" /></Field>
              <Field label="Issue condition photograph" wide><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setAssignmentPhoto(e.target.files?.[0] || null)} /></Field>
            </div>
            <div className="privacy-note"><Camera size={18} /><div><strong>Condition evidence</strong><p>The selected photograph is stored in the permanent custody history with the issue condition and notes.</p></div></div>
            <ModalFooter close={closeModal} saving={saving} label="Confirm assignment" />
          </form>
        </ModalLayer>
      )}

      {modal?.type === "return" && (
        <ModalLayer close={closeModal}>
          <ModalHead icon={Undo2} eyebrow="Return evidence" title={`Return ${returnDraft.asset?.assetTag || "company asset"}`} close={closeModal} />
          <form className="simple-modal-form" onSubmit={saveReturn}>
            <div className="registry-form-grid">
              <Field label="Condition when returned" wide><select value={returnDraft.returnCondition} onChange={(e) => setReturnDraft((c) => ({ ...c, returnCondition: e.target.value }))}>{CONDITION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
              <Field label="Return notes" wide><textarea rows={3} value={returnDraft.returnNotes} onChange={(e) => setReturnDraft((c) => ({ ...c, returnNotes: e.target.value }))} placeholder="Accessories returned, damage observed, or handover notes" /></Field>
              <Field label="Return condition photograph" wide><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setReturnPhoto(e.target.files?.[0] || null)} /></Field>
            </div>
            <div className="privacy-note"><Camera size={18} /><div><strong>Return evidence</strong><p>The condition, notes, and photograph remain attached to the asset assignment history.</p></div></div>
            <ModalFooter close={closeModal} saving={saving} label="Confirm return" />
          </form>
        </ModalLayer>
      )}

      {modal?.type === "transfer" && (
        <ModalLayer close={closeModal}>
          <ModalHead icon={MapPin} eyebrow="Office history" title={`Transfer ${transferDraft.targetType} to another office`} close={closeModal} />
          <form className="simple-modal-form" onSubmit={saveTransfer}>
            <div className="registry-form-grid">
              <Field label="Destination office *" wide><select required value={transferDraft.officeId} onChange={(e) => setTransferDraft((c) => ({ ...c, officeId: e.target.value }))}><option value="">Choose office…</option>{offices.filter((office) => office.status === "Active").map((office) => <option value={getId(office)} key={getId(office)}>{office.code} · {office.name}</option>)}</select></Field>
              <Field label="Transfer reason *" wide><textarea required rows={3} value={transferDraft.reason} onChange={(e) => setTransferDraft((c) => ({ ...c, reason: e.target.value }))} placeholder="Reason for the office transfer" /></Field>
            </div>
            <div className="privacy-note"><Clock3 size={18} /><div><strong>History is preserved</strong><p>The previous office remains in the permanent transfer timeline.</p></div></div>
            <ModalFooter close={closeModal} saving={saving} label="Confirm transfer" />
          </form>
        </ModalLayer>
      )}
    </div>
  );
};

const Field = ({ label, name, error, wide = false, children }) => (
  <label
    className={`${wide ? "wide" : ""} ${error ? "field-error" : ""}`.trim()}
    data-employee-field={name || undefined}
    data-employee-invalid={Boolean(error)}
  >
    <span>{label}</span>
    {children}
    {error && <small className="field-error-text">{error}</small>}
  </label>
);

const DocumentUpload = ({ label, type, file, ready, setFiles, error }) => (
  <label
    className={`document-upload ${file || ready ? "ready" : ""} ${error ? "field-error" : ""}`}
    data-employee-field={type}
    data-employee-invalid={Boolean(error)}
  >
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      onChange={(event) =>
        setFiles((current) => ({ ...current, [type]: event.target.files?.[0] }))
      }
    />
    <span>{file || ready ? <CheckCircle2 size={20} /> : <FileText size={20} />}</span>
    <div>
      <strong>{label}</strong>
      <small>{file?.name || (ready ? "Protected file already uploaded" : "Choose JPG, PNG, WebP, or PDF")}</small>
    </div>
    <i>{file ? "Selected" : ready ? "Verified" : "Upload"}</i>
    {error && <small className="field-error-text document-error">{error}</small>}
  </label>
);

const EmptyState = ({ icon: Icon, title, text, action, onAction }) => (
  <div className="registry-empty">
    <span><Icon size={26} /></span>
    <h2>{title}</h2>
    <p>{text}</p>
    <button type="button" onClick={onAction}><Plus size={15} /> {action}</button>
  </div>
);

const ModalLayer = ({ children, close, wide = false }) => (
  <div className="registry-modal-layer" role="presentation" onMouseDown={close}>
    <section
      className={`registry-modal ${wide ? "wide-modal" : ""}`}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
    </section>
  </div>
);

const ModalHead = ({ icon: Icon, eyebrow, title, close }) => (
  <div className="registry-modal-head">
    <span><Icon size={20} /></span>
    <div><p>{eyebrow}</p><h2>{title}</h2></div>
    <button type="button" onClick={close}><X size={19} /></button>
  </div>
);

const ModalFooter = ({ close, saving, label }) => (
  <footer className="modal-footer">
    <button type="button" className="registry-button ghost dark" onClick={close}>Cancel</button>
    <button type="submit" className="registry-button primary" disabled={saving}>{saving ? "Saving…" : label}</button>
  </footer>
);

export default PeopleAssets;
