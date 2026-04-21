import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.blogs)) return payload.blogs;
  return [];
};

const BlogList = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchBlogs = async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE_URL}/blogs/admin/list`);
      url.searchParams.set("status", "all");
      url.searchParams.set("limit", "200");
      const resp = await fetch(url.toString(), {
        cache: "no-store",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load blog posts");
      setBlogs(pickArray(data));
    } catch (err) {
      setError(err?.message || "Failed to load blog posts");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this blog post?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/blogs/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || "Delete failed");
      await fetchBlogs();
    } catch (err) {
      alert(err?.message || "Delete failed");
    }
  };

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        blogs
          .map((entry) => String(entry?.category || "").trim())
          .filter(Boolean)
      )
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [blogs]);

  const filteredBlogs = useMemo(
    () =>
      blogs.filter((entry) => {
        const status = String(entry?.workflow?.status || "draft").toLowerCase();
        const category = String(entry?.category || "").trim();
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (categoryFilter !== "all" && category !== categoryFilter) return false;
        return true;
      }),
    [blogs, statusFilter, categoryFilter]
  );

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <div className="page-container products-page">
      <div className="page-header products-header fancy">
        <div className="products-header-copy">
          <p className="products-eyebrow">Content CMS</p>
          <h2>Blog Posts</h2>
          <p className="muted">Automation-ready blog publishing with workflow states.</p>
        </div>
        <div className="header-side">
          <button className="btn secondary" onClick={() => navigate("/admin/dashboard")} type="button">
            ← Back
          </button>
          <button className="btn" onClick={() => navigate("/admin/blogs/new")} type="button">
            + New Blog Post
          </button>
        </div>
      </div>

      {error && (
        <div className="error-panel">
          <p className="error-panel-title">{error}</p>
          <div className="actions">
            <button className="btn" type="button" onClick={fetchBlogs}>Retry</button>
          </div>
        </div>
      )}

      <section className="card products-filter-bar">
        <div className="products-filter-controls">
          <label htmlFor="blog-status-filter">Status</label>
          <select id="blog-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>

          <label htmlFor="blog-category-filter">Category</label>
          <select
            id="blog-category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <span className="muted">Showing {filteredBlogs.length} of {blogs.length} posts</span>
      </section>

      <section className="card products-table-wrap">
        {loading ? (
          <div className="products-empty"><p>Loading blog posts...</p></div>
        ) : filteredBlogs.length === 0 ? (
          <div className="products-empty">
            <p>No blog posts found for the current filters.</p>
            <div className="actions" style={{ justifyContent: "center" }}>
              <button className="btn" type="button" onClick={() => navigate("/admin/blogs/new")}>
                Create First Blog Post
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Focus Keyword</th>
                  <th>Scheduled / Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlogs.map((entry) => {
                  const id = entry?._id || entry?.id;
                  const status = String(entry?.workflow?.status || "draft").toLowerCase();
                  return (
                    <tr key={id}>
                      <td>{entry?.title || "-"}</td>
                      <td>{entry?.slug || "-"}</td>
                      <td>{entry?.category || "-"}</td>
                      <td>
                        <span className={`status-pill status-${status === "published" ? "success" : status === "scheduled" ? "info" : "warn"}`}>
                          {status}
                        </span>
                      </td>
                      <td>{entry?.seo?.focusKeyword || entry?.automation?.targetKeyword || "-"}</td>
                      <td>{formatDate(entry?.workflow?.scheduledFor || entry?.workflow?.publishedAt)}</td>
                      <td>
                        <div className="actions">
                          <button className="btn" type="button" onClick={() => navigate(`/admin/blogs/${id}`)}>
                            Edit
                          </button>
                          <button className="btn danger" type="button" onClick={() => handleDelete(id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogList;
