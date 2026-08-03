import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  FileBadge2,
  FileText,
  IdCard,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  UploadCloud,
  UserRound,
  UsersRound,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";
import "./guest-employee-entry.css";

const STEPS = [
  { label: "Identity", hint: "Personal details", icon: UserRound },
  { label: "Employment", hint: "Role and office", icon: BriefcaseBusiness },
  { label: "Documents", hint: "Proof and submit", icon: FileBadge2 },
];

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  email: "",
  cnic: "",
  currentAddress: "",
  office: "",
  department: "",
  designation: "",
  joiningDate: "",
  emergencyContact: {
    name: "",
    relationship: "",
    phone: "",
  },
};

const DOCUMENT_FIELDS = [
  {
    key: "profilePhoto",
    label: "Profile photograph",
    hint: "JPG, PNG or WebP",
    accept: "image/jpeg,image/png,image/webp",
    icon: Camera,
  },
  {
    key: "cnicFront",
    label: "CNIC front",
    hint: "Required · Image or PDF",
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: IdCard,
  },
  {
    key: "cnicBack",
    label: "CNIC back",
    hint: "Required · Image or PDF",
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: IdCard,
  },
  {
    key: "contractDocument",
    label: "Contract document",
    hint: "Optional image or PDF",
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: FileText,
  },
  {
    key: "billProof",
    label: "Address proof",
    hint: "Optional utility bill",
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: MapPin,
  },
];

const authHeaders = () => {
  try {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const readPayload = async (response, fallback) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = parseApiError(payload, fallback);
    throw new Error(parsed.issues[0] || parsed.summary);
  }
  return payload;
};

const formatCnic = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

const GuestEmployeeEntry = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    emergencyContact: { ...EMPTY_FORM.emergencyContact },
  }));
  const [files, setFiles] = useState({});
  const [offices, setOffices] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadOptions = async () => {
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/employees/guest/options`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const payload = await readPayload(response, "Could not load the employee form");
        const nextOffices = Array.isArray(payload?.data?.offices)
          ? payload.data.offices
          : [];
        setOffices(nextOffices);
        if (nextOffices.length === 1) {
          setForm((current) => ({ ...current, office: nextOffices[0].id }));
        }
      } catch (requestError) {
        setError(requestError.message || "Could not load the employee form");
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const selectedOffice = useMemo(
    () => offices.find((office) => office.id === form.office),
    [form.office, offices]
  );

  const setField = (name, value) => {
    setError("");
    setForm((current) => ({ ...current, [name]: value }));
  };

  const setEmergencyField = (name, value) => {
    setError("");
    setForm((current) => ({
      ...current,
      emergencyContact: { ...current.emergencyContact, [name]: value },
    }));
  };

  const validateStep = (targetStep) => {
    if (targetStep === 0) {
      if (!form.fullName.trim()) return "Employee full name is required.";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        return "Enter a valid email address.";
      }
      if (!form.cnic.trim()) return "Employee CNIC is required.";
      if (!/^\d{5}-\d{7}-\d$/.test(form.cnic)) {
        return "CNIC must use the format 12345-1234567-1.";
      }
    }
    if (targetStep === 1 && !form.office) {
      return "Select the employee office before continuing.";
    }
    if (targetStep === 2) {
      if (!files.cnicFront) return "Upload the front of the employee CNIC.";
      if (!files.cnicBack) return "Upload the back of the employee CNIC.";
    }
    return "";
  };

  const goNext = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const uploadDocument = async (documentType, file) => {
    const body = new FormData();
    body.append("documentType", documentType);
    body.append("file", file);
    const response = await fetch(`${API_BASE_URL}/employees/guest/documents`, {
      method: "POST",
      headers: authHeaders(),
      body,
    });
    return (await readPayload(response, `Could not upload ${file.name}`)).data;
  };

  const submitEmployee = async () => {
    const validationErrors = STEPS.map((_, index) => validateStep(index));
    const invalidStep = validationErrors.findIndex(Boolean);
    if (invalidStep !== -1) {
      setError(validationErrors[invalidStep]);
      setStep(invalidStep);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const documents = {};
      for (const document of DOCUMENT_FIELDS) {
        const file = files[document.key];
        if (!file) continue;
        setUploadingLabel(`Uploading ${document.label.toLowerCase()}…`);
        documents[document.key] = await uploadDocument(document.key, file);
      }

      setUploadingLabel("Saving employee details…");
      const response = await fetch(`${API_BASE_URL}/employees/guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ ...form, ...documents }),
      });
      const payload = await readPayload(response, "Could not save employee details");
      setSuccess(payload.data || { fullName: form.fullName });
    } catch (requestError) {
      setError(requestError.message || "Could not save employee details");
    } finally {
      setSaving(false);
      setUploadingLabel("");
    }
  };

  const reset = () => {
    setForm({
      ...EMPTY_FORM,
      emergencyContact: { ...EMPTY_FORM.emergencyContact },
      office: offices.length === 1 ? offices[0].id : "",
    });
    setFiles({});
    setStep(0);
    setError("");
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="guest-entry-page">
        <section className="guest-entry-success" aria-live="polite">
          <span className="guest-entry-success-icon"><CheckCircle2 size={34} /></span>
          <p>Employee draft received</p>
          <h1>{success.fullName}</h1>
          <span>
            {success.employeeCode
              ? `Reference ${success.employeeCode}`
              : "The record is ready for manager review."}
          </span>
          <div className="guest-entry-success-note">
            <ShieldCheck size={18} />
            Saved as a draft. A manager can review and activate the employee later.
          </div>
          <button type="button" onClick={reset}>
            <Plus size={18} /> Add another employee
          </button>
        </section>
      </div>
    );
  }

  const ActiveStepIcon = STEPS[step].icon;

  return (
    <div className="guest-entry-page">
      <header className="guest-entry-hero">
        <div>
          <p><UsersRound size={16} /> People workspace</p>
          <h1>Employee quick entry</h1>
          <span>Add a new employee draft without opening the company registry.</span>
        </div>
        <div className="guest-entry-scope">
          <LockKeyhole size={17} />
          <span><strong>Create-only access</strong><small>Company records stay hidden</small></span>
        </div>
      </header>

      <div className="guest-entry-shell">
        <aside className="guest-entry-rail">
          <div className="guest-entry-rail-intro">
            <span><ActiveStepIcon size={20} /></span>
            <p>Step {step + 1} of {STEPS.length}</p>
            <strong>{STEPS[step].label}</strong>
          </div>
          <ol>
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const state = index < step ? "done" : index === step ? "active" : "";
              return (
                <li key={item.label} className={state}>
                  <span>{index < step ? <Check size={17} /> : <Icon size={17} />}</span>
                  <div><strong>{item.label}</strong><small>{item.hint}</small></div>
                </li>
              );
            })}
          </ol>
          <div className="guest-entry-privacy">
            <ShieldCheck size={18} />
            <p><strong>Private by design</strong>Your session cannot view employees, assets, offices, or orders.</p>
          </div>
        </aside>

        <form className="guest-entry-form" onSubmit={(event) => event.preventDefault()}>
          <div className="guest-entry-form-heading">
            <p>{STEPS[step].hint}</p>
            <h2>{
              step === 0
                ? "Who is joining the team?"
                : step === 1
                  ? "Where will they work?"
                  : "Finish the employee draft"
            }</h2>
          </div>

          {error && step !== 2 && <div className="guest-entry-error" role="alert">{error}</div>}

          {step === 0 && (
            <div className="guest-entry-fields">
              <label className="guest-entry-field guest-entry-span-2">
                <span>Full name <em>Required</em></span>
                <div><UserRound size={18} /><input autoFocus value={form.fullName} onChange={(event) => setField("fullName", event.target.value)} placeholder="Employee's legal name" autoComplete="name" /></div>
              </label>
              <label className="guest-entry-field">
                <span>Phone number</span>
                <div><Phone size={18} /><input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="+92 300 0000000" autoComplete="tel" /></div>
              </label>
              <label className="guest-entry-field">
                <span>Email address</span>
                <div><Mail size={18} /><input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="name@example.com" autoComplete="email" /></div>
              </label>
              <label className="guest-entry-field">
                <span>CNIC <em>Required</em></span>
                <div><IdCard size={18} /><input required inputMode="numeric" value={form.cnic} onChange={(event) => setField("cnic", formatCnic(event.target.value))} placeholder="12345-1234567-1" /></div>
              </label>
              <label className="guest-entry-upload guest-entry-photo">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, profilePhoto: event.target.files?.[0] || null }))} />
                <span><Camera size={20} /></span>
                <div><strong>{files.profilePhoto?.name || "Add profile photo"}</strong><small>Optional · up to 10 MB</small></div>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="guest-entry-fields">
              <label className="guest-entry-field guest-entry-span-2">
                <span>Office <em>Required</em></span>
                <div><Building2 size={18} /><select value={form.office} onChange={(event) => setField("office", event.target.value)} disabled={loadingOptions}>
                  <option value="">{loadingOptions ? "Loading offices…" : "Select an office"}</option>
                  {offices.map((office) => <option key={office.id} value={office.id}>{office.name} · {office.city} ({office.code})</option>)}
                </select></div>
              </label>
              <label className="guest-entry-field">
                <span>Department</span>
                <div><UsersRound size={18} /><input value={form.department} onChange={(event) => setField("department", event.target.value)} placeholder="e.g. Sales" /></div>
              </label>
              <label className="guest-entry-field">
                <span>Designation</span>
                <div><BadgeCheck size={18} /><input value={form.designation} onChange={(event) => setField("designation", event.target.value)} placeholder="e.g. Product Specialist" /></div>
              </label>
              <label className="guest-entry-field">
                <span>Joining date</span>
                <div><BriefcaseBusiness size={18} /><input type="date" value={form.joiningDate} onChange={(event) => setField("joiningDate", event.target.value)} /></div>
              </label>
              <label className="guest-entry-field guest-entry-span-2">
                <span>Current residential address</span>
                <div className="guest-entry-textarea"><MapPin size={18} /><textarea value={form.currentAddress} onChange={(event) => setField("currentAddress", event.target.value)} placeholder="Complete current address" rows={3} /></div>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="guest-entry-final">
              <section>
                <div className="guest-entry-section-title"><div><strong>Emergency contact</strong><small>Optional contact person</small></div></div>
                <div className="guest-entry-fields guest-entry-compact">
                  <label className="guest-entry-field"><span>Contact name</span><div><UserRound size={18} /><input value={form.emergencyContact.name} onChange={(event) => setEmergencyField("name", event.target.value)} placeholder="Full name" /></div></label>
                  <label className="guest-entry-field"><span>Relationship</span><div><UsersRound size={18} /><input value={form.emergencyContact.relationship} onChange={(event) => setEmergencyField("relationship", event.target.value)} placeholder="e.g. Parent" /></div></label>
                  <label className="guest-entry-field guest-entry-span-2"><span>Contact phone</span><div><Phone size={18} /><input value={form.emergencyContact.phone} onChange={(event) => setEmergencyField("phone", event.target.value)} placeholder="+92 300 0000000" /></div></label>
                </div>
              </section>
              <section>
                <div className="guest-entry-section-title"><div><strong>Identity documents</strong><small>CNIC front and back are required; other documents are optional</small></div></div>
                <div className="guest-entry-document-grid">
                  {DOCUMENT_FIELDS.filter((item) => item.key !== "profilePhoto").map((document) => {
                    const Icon = document.icon;
                    return (
                      <label className={files[document.key] ? "guest-entry-document has-file" : "guest-entry-document"} key={document.key}>
                        <input required={document.key === "cnicFront" || document.key === "cnicBack"} type="file" accept={document.accept} onChange={(event) => setFiles((current) => ({ ...current, [document.key]: event.target.files?.[0] || null }))} />
                        <span>{files[document.key] ? <Check size={18} /> : <Icon size={18} />}</span>
                        <div><strong>{files[document.key]?.name || document.label}</strong><small>{files[document.key] ? "Ready to upload" : document.hint}</small></div>
                        <UploadCloud size={17} />
                      </label>
                    );
                  })}
                </div>
              </section>
              <div className="guest-entry-review">
                <div><Building2 size={18} /><span><small>Office</small><strong>{selectedOffice ? `${selectedOffice.name}, ${selectedOffice.city}` : "Not selected"}</strong></span></div>
                <div><FileText size={18} /><span><small>Record status</small><strong>Draft for manager review</strong></span></div>
              </div>
            </div>
          )}

          {error && step === 2 && <div className="guest-entry-error" role="alert">{error}</div>}

          <footer className="guest-entry-actions">
            <button type="button" className="guest-entry-back" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving}>
              <ArrowLeft size={18} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="guest-entry-next" onClick={goNext} disabled={loadingOptions}>
                Continue <ArrowRight size={18} />
              </button>
            ) : (
              <button type="button" className="guest-entry-next" onClick={submitEmployee} disabled={saving}>
                {saving ? <><LoaderCircle className="guest-entry-spin" size={18} /> {uploadingLabel || "Saving…"}</> : <>Submit employee draft <ArrowRight size={18} /></>}
              </button>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
};

export default GuestEmployeeEntry;
