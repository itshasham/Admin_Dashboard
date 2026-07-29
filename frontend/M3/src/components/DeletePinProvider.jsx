/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, KeyRound, LockKeyhole, ShieldCheck, X } from "lucide-react";
import "./delete-pin.css";

const readAdmin = () => {
  try {
    const raw = localStorage.getItem("adminData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const DeletePinProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const [pin, setPin] = useState("");
  const inputRef = useRef(null);
  const nativeFetchRef = useRef(window.fetch.bind(window));

  const askForDeletePin = useCallback((resourceUrl = "") => {
    const admin = readAdmin();
    if (admin?.role !== "CEO") {
      return Promise.reject(
        new Error("Only the CEO can permanently delete company records.")
      );
    }

    return new Promise((resolve, reject) => {
      setPin("");
      setRequest({
        resourceUrl: String(resourceUrl),
        resolve,
        reject,
      });
    });
  }, []);

  const cancel = useCallback(() => {
    request?.reject?.(new Error("Deletion cancelled."));
    setRequest(null);
    setPin("");
  }, [request]);

  const confirm = useCallback(
    (event) => {
      event.preventDefault();
      if (!/^\d{4}$/.test(pin)) return;
      request?.resolve?.(pin);
      setRequest(null);
      setPin("");
    },
    [pin, request]
  );

  useEffect(() => {
    if (!request) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [cancel, request]);

  useEffect(() => {
    const nativeFetch = nativeFetchRef.current;
    window.fetch = async (input, init = {}) => {
      const requestMethod =
        init.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
      if (String(requestMethod || "GET").toUpperCase() !== "DELETE") {
        return nativeFetch(input, init);
      }

      const pinValue = await askForDeletePin(
        typeof input === "string" ? input : input?.url || ""
      );
      const headers = new Headers(
        init.headers ||
          (typeof Request !== "undefined" && input instanceof Request
            ? input.headers
            : undefined)
      );
      headers.set("x-delete-pin", pinValue);
      return nativeFetch(input, { ...init, headers });
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, [askForDeletePin]);

  return (
    <>
      {children}
      {request && (
        <div className="delete-pin-layer" role="presentation" onMouseDown={cancel}>
          <section
            className="delete-pin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-pin-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="delete-pin-accent" aria-hidden="true" />
            <button
              type="button"
              className="delete-pin-close"
              onClick={cancel}
              aria-label="Cancel deletion"
            >
              <X size={18} />
            </button>
            <span className="delete-pin-icon" aria-hidden="true">
              <LockKeyhole size={25} />
            </span>
            <p className="delete-pin-eyebrow">
              <ShieldCheck size={14} /> CEO authorization
            </p>
            <h2 id="delete-pin-title">Confirm permanent deletion</h2>
            <p className="delete-pin-copy">
              This action permanently removes company data. Enter the four-digit
              delete PIN to continue.
            </p>
            <div className="delete-pin-warning">
              <AlertTriangle size={17} />
              <span>This action cannot be undone.</span>
            </div>
            <form onSubmit={confirm}>
              <label>
                <span>Secret delete PIN</span>
                <div>
                  <KeyRound size={17} aria-hidden="true" />
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    pattern="\d{4}"
                    value={pin}
                    onChange={(event) =>
                      setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                    aria-describedby="delete-pin-help"
                  />
                </div>
                <small id="delete-pin-help">Four digits · visible only to the CEO</small>
              </label>
              <div className="delete-pin-actions">
                <button type="button" className="secondary" onClick={cancel}>
                  Keep record
                </button>
                <button
                  type="submit"
                  className="danger"
                  disabled={!/^\d{4}$/.test(pin)}
                >
                  Delete permanently
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
