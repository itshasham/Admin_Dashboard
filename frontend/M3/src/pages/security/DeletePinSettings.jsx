import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";
import "./delete-pin-settings.css";

const authHeaders = () => {
  try {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const DeletePinSettings = () => {
  const [form, setForm] = useState({
    oldPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/security/delete-pin`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const parsed = parseApiError(payload, "Could not load PIN status");
          throw new Error(parsed.issues[0] || parsed.summary);
        }
        setStatus(payload.data);
      } catch (requestError) {
        setError(requestError.message || "Could not load security settings");
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, []);

  const updateField = (field, value) => {
    setError("");
    setNotice("");
    setForm((current) => ({
      ...current,
      [field]: value.replace(/\D/g, "").slice(0, 4),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d{4}$/.test(form.oldPin) || !/^\d{4}$/.test(form.newPin)) {
      setError("Both current and new PINs must contain exactly four digits.");
      return;
    }
    if (form.newPin !== form.confirmPin) {
      setError("New PIN and confirmation do not match.");
      return;
    }
    if (form.oldPin === form.newPin) {
      setError("Choose a new PIN that is different from the current PIN.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/security/delete-pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const parsed = parseApiError(payload, "Could not change delete PIN");
        throw new Error(parsed.issues[0] || parsed.summary);
      }
      setNotice(payload.message || "Delete PIN changed successfully.");
      setStatus(payload.data);
      setForm({ oldPin: "", newPin: "", confirmPin: "" });
    } catch (requestError) {
      setError(requestError.message || "Could not change delete PIN");
    } finally {
      setSaving(false);
    }
  };

  const changedLabel = status?.changedAt
    ? new Date(status.changedAt).toLocaleString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not available";

  return (
    <div className="pin-settings-page">
      <header className="pin-settings-hero">
        <div>
          <p><ShieldCheck size={15} /> CEO security control</p>
          <h1>Delete PIN</h1>
          <span>
            Protect permanent deletion across orders, employee data, assets,
            documents, and every admin module.
          </span>
        </div>
        <div className="pin-status-card">
          <span><LockKeyhole size={19} /></span>
          <div>
            <small>Protection status</small>
            <strong>{loading ? "Checking…" : status?.configured ? "Active" : "Unavailable"}</strong>
            <p>Last changed {changedLabel}</p>
          </div>
        </div>
      </header>

      <div className="pin-settings-grid">
        <section className="pin-settings-panel">
          <div className="pin-panel-heading">
            <span><KeyRound size={20} /></span>
            <div>
              <p>Credential rotation</p>
              <h2>Set a new four-digit PIN</h2>
            </div>
          </div>

          {(error || notice) && (
            <div className={`pin-message ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
              {error ? <AlertTriangle size={17} /> : <Check size={17} />}
              <span>{error || notice}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <label>
              <span>Current PIN</span>
              <div className="pin-input">
                <LockKeyhole size={17} />
                <input
                  required
                  type={visible ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={form.oldPin}
                  maxLength={4}
                  onChange={(event) => updateField("oldPin", event.target.value)}
                  placeholder="••••"
                />
              </div>
            </label>
            <div className="pin-new-grid">
              <label>
                <span>New PIN</span>
                <div className="pin-input">
                  <KeyRound size={17} />
                  <input
                    required
                    type={visible ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={form.newPin}
                    maxLength={4}
                    onChange={(event) => updateField("newPin", event.target.value)}
                    placeholder="••••"
                  />
                </div>
              </label>
              <label>
                <span>Confirm new PIN</span>
                <div className="pin-input">
                  <Check size={17} />
                  <input
                    required
                    type={visible ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={form.confirmPin}
                    maxLength={4}
                    onChange={(event) => updateField("confirmPin", event.target.value)}
                    placeholder="••••"
                  />
                </div>
              </label>
            </div>
            <div className="pin-form-footer">
              <button
                type="button"
                className="pin-visibility"
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                {visible ? "Hide PINs" : "Show while typing"}
              </button>
              <button type="submit" className="pin-save" disabled={saving || loading}>
                {saving ? <RefreshCw size={17} className="spin" /> : <ShieldCheck size={17} />}
                {saving ? "Updating…" : "Update delete PIN"}
              </button>
            </div>
          </form>
        </section>

        <aside className="pin-policy-panel">
          <p className="pin-policy-eyebrow">Protection policy</p>
          <h2>Two checks before data disappears.</h2>
          <ol>
            <li>
              <span>01</span>
              <div><strong>CEO account</strong><p>The signed-in user must have the CEO role.</p></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>Current secret PIN</strong><p>The four-digit PIN is verified securely by the API.</p></div>
            </li>
          </ol>
          <div className="pin-policy-note">
            <AlertTriangle size={18} />
            <p>
              The PIN is stored as a one-way hash. It cannot be viewed or
              recovered—only replaced using the current PIN.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DeletePinSettings;
