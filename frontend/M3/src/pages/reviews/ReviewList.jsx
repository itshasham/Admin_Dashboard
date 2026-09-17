import React, { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, RotateCcw, X } from "lucide-react";
import { API_BASE_URL } from "../../config/api";

const STATUS_OPTIONS = ["pending", "approved", "rejected", "hidden"];

const ReviewList = () => {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("pending");
  const [rating, setRating] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const headers = () => {
    const token = localStorage.getItem("adminToken");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status, limit: "50" });
      if (rating) params.set("rating", rating);
      const response = await fetch(`${API_BASE_URL}/admin/reviews?${params.toString()}`, { headers: headers() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Could not load reviews.");
      setReviews(Array.isArray(payload?.data) ? payload.data : []);
    } catch (requestError) {
      setError(requestError.message || "Could not load reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [status, rating]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const moderate = async (review, nextStatus) => {
    const current = String(review?.status || "");
    const needsNote = nextStatus === "rejected" || nextStatus === "hidden";
    const note = needsNote ? window.prompt(`Internal note for ${nextStatus} (optional):`, "") : "";
    if (note === null) return;
    setSavingId(String(review._id));
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews/${review._id}/status`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status: nextStatus, note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Could not update review.");
      if (current === status && nextStatus !== status) setReviews((items) => items.filter((item) => item._id !== review._id));
      else await loadReviews();
    } catch (requestError) {
      window.alert(requestError.message || "Could not update review.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <main className="page-container">
      <section className="page-header">
        <div>
          <p className="eyebrow">Customer feedback</p>
          <h1>Product reviews</h1>
          <p>Only reviews from delivered orders arrive here. Approve honest reviews to publish them on the storefront.</p>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18, padding: 16 }}>
        <div className="form-row" style={{ alignItems: "end" }}>
          <label className="form-cell">Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
            </select>
          </label>
          <label className="form-cell">Rating
            <select value={rating} onChange={(event) => setRating(event.target.value)}>
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((item) => <option key={item} value={item}>{item} stars</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-secondary" onClick={loadReviews}>Refresh</button>
        </div>
      </section>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <p>Loading reviews…</p> : null}
      {!loading && !reviews.length ? <div className="card" style={{ padding: 24 }}>No {status} reviews found.</div> : null}
      <section style={{ display: "grid", gap: 14 }}>
        {reviews.map((review) => {
          const isSaving = savingId === String(review._id);
          const reviewer = review?.userId?.name || "Customer";
          const product = review?.productId?.title || "Unknown product";
          return (
            <article key={review._id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <strong>{product}</strong>
                  <p style={{ margin: "5px 0", color: "#5c6875" }}>{reviewer} · {review.rating}/5 stars · Order #{review?.orderId?.invoice || "—"}</p>
                  {review.title ? <h3 style={{ margin: "12px 0 5px", fontSize: "1rem" }}>{review.title}</h3> : null}
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{review.comment}</p>
                </div>
                <span className={`status-pill status-${review.status === "approved" ? "success" : review.status === "pending" ? "warn" : "info"}`}>{review.status}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {review.status !== "approved" ? <button type="button" className="btn btn-primary" disabled={isSaving} onClick={() => moderate(review, "approved")}><Check size={15} /> Approve</button> : null}
                {review.status !== "rejected" ? <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => moderate(review, "rejected")}><X size={15} /> Reject</button> : null}
                {review.status !== "hidden" ? <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => moderate(review, "hidden")}><EyeOff size={15} /> Hide</button> : null}
                {review.status === "hidden" || review.status === "rejected" ? <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => moderate(review, "pending")}><RotateCcw size={15} /> Return to pending</button> : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
};

export default ReviewList;
