import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import "./AdminLogin.css";
import { API_BASE_URL } from "../config/api";

const AdminLogin = () => {
  const [mode, setMode] = useState("staff");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [guestPin, setGuestPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const selectMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  const saveSession = (data, destination) => {
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminData", JSON.stringify(data));
    navigate(destination, { replace: true });
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please check your credentials.");
      }
      saveSession(data, "/admin/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(guestPin)) {
      setError("Enter the four-digit quick-entry PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/guest-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: guestPin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "The quick-entry PIN is incorrect.");
      }
      saveSession(data, "/admin/people-assets");
    } catch (requestError) {
      setError(requestError.message || "Could not start quick entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login-brand" aria-label="NEES Medical admin workspace">
        <div className="admin-login-brand-top">
          <span className="admin-login-mark">N</span>
          <span><strong>NEES Medical</strong><small>Admin workspace</small></span>
        </div>
        <div className="admin-login-brand-copy">
          <p><ShieldCheck size={16} /> Secure operations</p>
          <h1>One workspace.<br />Two ways in.</h1>
          <span>
            Staff manage the business. Quick Entry lets a trusted helper submit
            a new employee draft without exposing company records.
          </span>
        </div>
        <div className="admin-login-scope-card">
          <div><UserRoundPlus size={21} /></div>
          <span><small>Quick Entry scope</small><strong>Create employee drafts only</strong></span>
          <BadgeCheck size={19} />
        </div>
        <div className="admin-login-orbit" aria-hidden="true" />
      </section>

      <section className="admin-login-panel">
        <div className="admin-login-card">
          <div className="admin-login-heading">
            <p>{mode === "staff" ? "Staff access" : "Guest access"}</p>
            <h2>{mode === "staff" ? "Welcome back" : "Start quick entry"}</h2>
            <span>
              {mode === "staff"
                ? "Sign in with your administrator account."
                : "Use the four-digit PIN to submit employee information."}
            </span>
          </div>

          <div className="admin-login-modes" role="tablist" aria-label="Sign-in method">
            <button type="button" role="tab" aria-selected={mode === "staff"} className={mode === "staff" ? "active" : ""} onClick={() => selectMode("staff")}>
              <LockKeyhole size={16} /> Staff login
            </button>
            <button type="button" role="tab" aria-selected={mode === "guest"} className={mode === "guest" ? "active" : ""} onClick={() => selectMode("guest")}>
              <KeyRound size={16} /> Quick entry
            </button>
          </div>

          {error && <div className="admin-login-error" role="alert">{error}</div>}

          {mode === "staff" ? (
            <form onSubmit={handleStaffSubmit} className="admin-login-form">
              <label>
                <span>Email address</span>
                <input type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} required placeholder="you@neesmedical.com" autoComplete="email" />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} required placeholder="Enter your password" autoComplete="current-password" />
              </label>
              <button type="submit" className="admin-login-submit" disabled={loading}>
                {loading ? "Signing in…" : <>Sign in to workspace <ArrowRight size={18} /></>}
              </button>
              <Link to="/admin/forgot-password" className="admin-login-forgot">Forgot your password?</Link>
            </form>
          ) : (
            <form onSubmit={handleGuestSubmit} className="admin-login-form admin-login-guest-form">
              <label>
                <span>Quick-entry PIN</span>
                <div className="admin-login-pin-wrap">
                  <KeyRound size={19} />
                  <input autoFocus type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" value={guestPin} onChange={(event) => setGuestPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" autoComplete="one-time-code" aria-describedby="quick-entry-help" />
                </div>
              </label>
              <div className="admin-login-guest-note" id="quick-entry-help">
                <ShieldCheck size={18} />
                <span><strong>Your access is private and limited.</strong>You can submit a new employee draft, but cannot view employees, equipment, assets, orders, or offices.</span>
              </div>
              <button type="submit" className="admin-login-submit" disabled={loading || guestPin.length !== 4}>
                {loading ? "Checking PIN…" : <>Open employee entry <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          <footer className="admin-login-footer">
            <span><LockKeyhole size={13} /> Protected NEES Medical system</span>
            {mode === "staff" && <span>Need an account? <Link to="/admin/register">Register</Link></span>}
          </footer>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
