import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, MessageCircle, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import "./whatsapp.css";

const DEFAULT_FORM = {
  templateName: "",
  language: "en_US",
  bodyParams: "",
  confirmOptIn: false,
};

const getAuthHeaders = () => {
  try {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const WhatsAppCampaign = () => {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/whatsapp/status`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "Unable to load WhatsApp status");
      setStatus(data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load WhatsApp status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const bodyParams = useMemo(
    () => form.bodyParams.split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 10),
    [form.bodyParams]
  );

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const sendCampaign = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!status?.enabled || !status?.configured) {
      setError("WhatsApp is not configured on the backend yet.");
      return;
    }
    if (!form.confirmOptIn) {
      setError("Confirm that the selected customers opted in to WhatsApp marketing.");
      return;
    }
    if (!form.templateName.trim()) {
      setError("Enter the approved WhatsApp template name.");
      return;
    }
    if (!status.recipientCount) {
      setError("There are no opted-in customers with a WhatsApp number yet.");
      return;
    }
    if (!window.confirm(`Send this approved template to ${status.recipientCount} opted-in customers?`)) return;

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/whatsapp/campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          templateName: form.templateName.trim(),
          language: form.language.trim() || "en_US",
          bodyParams,
          confirmOptIn: form.confirmOptIn,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "Campaign send failed");
      setResult(data);
      setForm((current) => ({ ...current, confirmOptIn: false }));
      await loadStatus();
    } catch (sendError) {
      setError(sendError.message || "Campaign send failed");
    } finally {
      setSending(false);
    }
  };

  const ready = Boolean(status?.enabled && status?.configured);
  const recipientCount = Number(status?.recipientCount || 0);

  return (
    <div className="page-container whatsapp-page">
      <div className="page-header whatsapp-header">
        <div>
          <p className="whatsapp-eyebrow">Customer outreach</p>
          <h2>WhatsApp campaigns</h2>
          <p className="whatsapp-header-copy">Send approved NEES offers and news to customers who opted in at checkout.</p>
        </div>
        <div className="actions">
          <button className="btn secondary" type="button" onClick={loadStatus} disabled={loading || sending}>
            <RefreshCw size={15} aria-hidden="true" className={loading ? "whatsapp-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className={`whatsapp-status ${ready ? "is-ready" : "is-pending"}`} role="status">
        {ready ? <ShieldCheck size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
        <div>
          <strong>{ready ? "Ready to send" : "Setup required"}</strong>
          <span>
            {loading
              ? "Checking WhatsApp configuration..."
              : `${recipientCount} opted-in customer${recipientCount === 1 ? "" : "s"} available`}
          </span>
        </div>
      </div>

      {error && <div className="error-panel whatsapp-error" role="alert">{error}</div>}

      <div className="whatsapp-campaign-grid">
        <form className="card whatsapp-form" onSubmit={sendCampaign}>
          <div className="whatsapp-form-heading">
            <MessageCircle size={19} aria-hidden="true" />
            <div>
              <h3>New campaign</h3>
              <p>Marketing messages must use a Meta-approved template.</p>
            </div>
          </div>

          <label className="whatsapp-field">
            <span>Approved template name</span>
            <input
              name="templateName"
              value={form.templateName}
              onChange={updateField}
              placeholder="nees_discount_news"
              pattern="[A-Za-z0-9_-]+"
              required
            />
          </label>

          <label className="whatsapp-field">
            <span>Template language</span>
            <input
              name="language"
              value={form.language}
              onChange={updateField}
              placeholder="en_US"
              required
            />
          </label>

          <label className="whatsapp-field">
            <span>Template variables</span>
            <textarea
              name="bodyParams"
              value={form.bodyParams}
              onChange={updateField}
              rows={5}
              placeholder={"15% off\nSummer skincare offer\nhttps://neesmedical.com/shop"}
            />
            <small>One value per line, in the same order as the template placeholders.</small>
          </label>

          <label className="whatsapp-confirm">
            <input type="checkbox" name="confirmOptIn" checked={form.confirmOptIn} onChange={updateField} />
            <span>I confirm these customers gave permission to receive WhatsApp marketing.</span>
          </label>

          <button className="btn whatsapp-send-button" type="submit" disabled={sending || loading || !ready || !recipientCount}>
            <Send size={15} aria-hidden="true" />
            {sending ? "Sending..." : `Send to ${recipientCount || 0} customers`}
          </button>
        </form>

        <aside className="whatsapp-side-panel">
          <div className="whatsapp-side-icon"><MessageCircle size={20} aria-hidden="true" /></div>
          <h3>Audience protection</h3>
          <p>Recipients are deduplicated by phone number and limited to customers who checked the WhatsApp marketing option during checkout.</p>
          <dl>
            <div><dt>Audience</dt><dd>Opted-in checkout customers</dd></div>
            <div><dt>Template</dt><dd>Meta-approved only</dd></div>
            <div><dt>Batch limit</dt><dd>500 recipients by default</dd></div>
          </dl>
        </aside>
      </div>

      {result && (
        <div className="whatsapp-result" role="status">
          <strong>Campaign complete</strong>
          <span>{result.sent || 0} sent, {result.failed || 0} failed out of {result.attempted || result.recipientCount || 0} attempts.</span>
          {result.truncated && <small>The configured batch limit was reached; remaining recipients were not included.</small>}
        </div>
      )}
    </div>
  );
};

export default WhatsAppCampaign;
