import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../products/product.css";
import { API_BASE_URL } from "../../config/api";
import { parseApiError } from "../../utils/api-error";

const emptyBlog = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featuredImage: "",
  galleryImages: [],
  category: "",
  tags: [],
  faqItems: [{ question: "", answer: "" }],
  beforeAfterImages: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    focusKeyword: "",
    secondaryKeywords: [],
    noIndex: false,
  },
  workflow: {
    status: "draft",
    approvalRequired: true,
    reviewer: "",
    scheduledFor: "",
    publishedAt: "",
  },
  automation: {
    targetKeyword: "",
    secondaryKeywords: [],
    searchIntent: "",
    targetLocation: "",
    contentBrief: "",
    generationSource: "manual",
    generatedDraft: "",
    lastHumanEditedBy: "",
    autoPublishEnabled: false,
  },
  author: {
    name: "",
    id: "",
  },
};

const toSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const uniqueStrings = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((entry) => entry.trim());
  const seen = new Set();
  const out = [];
  source.forEach((entry) => {
    const item = String(entry || "").trim();
    if (!item) return;
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const fromDateInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const BlogForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const editorRef = useRef(null);

  const [blog, setBlog] = useState(emptyBlog);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState([]);

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const autoReadMinutes = useMemo(() => {
    const plain = String(blog.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return 0;
    return Math.max(1, Math.ceil(plain.split(" ").filter(Boolean).length / 220));
  }, [blog.content]);

  const exec = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setBlog((prev) => ({
      ...prev,
      content: editorRef.current?.innerHTML || prev.content,
    }));
  };

  const syncEditor = (value) => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  };

  const fetchBlog = async () => {
    if (!isEdit) return;
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/blogs/${id}`, {
        headers: { ...getAuthHeaders() },
        cache: "no-store",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Failed to load blog");
      const item = data?.data || {};
      const normalized = {
        ...emptyBlog,
        ...item,
        tags: uniqueStrings(item?.tags || []),
        galleryImages: uniqueStrings(item?.galleryImages || []),
        faqItems: Array.isArray(item?.faqItems) && item.faqItems.length ? item.faqItems : [{ question: "", answer: "" }],
        beforeAfterImages: Array.isArray(item?.beforeAfterImages) ? item.beforeAfterImages : [],
        seo: {
          ...emptyBlog.seo,
          ...(item?.seo || {}),
          secondaryKeywords: uniqueStrings(item?.seo?.secondaryKeywords || []),
        },
        workflow: {
          ...emptyBlog.workflow,
          ...(item?.workflow || {}),
          scheduledFor: toDateInput(item?.workflow?.scheduledFor),
          publishedAt: toDateInput(item?.workflow?.publishedAt),
        },
        automation: {
          ...emptyBlog.automation,
          ...(item?.automation || {}),
          secondaryKeywords: uniqueStrings(item?.automation?.secondaryKeywords || []),
        },
        author: {
          ...emptyBlog.author,
          ...(item?.author || {}),
        },
      };
      setBlog(normalized);
      syncEditor(normalized.content);
    } catch (err) {
      setError(err?.message || "Failed to load blog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, [id]);

  useEffect(() => {
    if (!isEdit) {
      syncEditor(blog.content);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      syncEditor(blog.content);
    }
  }, [loading, blog.content]);

  const handleRoot = (event) => {
    const { name, value } = event.target;
    setBlog((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "title" && !prev.slug) {
        next.slug = toSlug(value);
      }
      return next;
    });
  };

  const handleSeo = (event) => {
    const { name, value, type, checked } = event.target;
    setBlog((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const handleWorkflow = (event) => {
    const { name, value, type, checked } = event.target;
    setBlog((prev) => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const handleAutomation = (event) => {
    const { name, value, type, checked } = event.target;
    setBlog((prev) => ({
      ...prev,
      automation: {
        ...prev.automation,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const handleAuthor = (event) => {
    const { name, value } = event.target;
    setBlog((prev) => ({
      ...prev,
      author: {
        ...prev.author,
        [name]: value,
      },
    }));
  };

  const addGalleryUrl = () => {
    const value = String(newGalleryUrl || "").trim();
    if (!value) return;
    setBlog((prev) => ({
      ...prev,
      galleryImages: uniqueStrings([...(prev.galleryImages || []), value]),
    }));
    setNewGalleryUrl("");
  };

  const removeGalleryUrl = (index) => {
    setBlog((prev) => ({
      ...prev,
      galleryImages: (prev.galleryImages || []).filter((_, idx) => idx !== index),
    }));
  };

  const addFaq = () => {
    setBlog((prev) => ({
      ...prev,
      faqItems: [...(prev.faqItems || []), { question: "", answer: "" }],
    }));
  };

  const updateFaq = (index, field, value) => {
    setBlog((prev) => ({
      ...prev,
      faqItems: (prev.faqItems || []).map((entry, idx) =>
        idx === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeFaq = (index) => {
    setBlog((prev) => ({
      ...prev,
      faqItems: (prev.faqItems || []).filter((_, idx) => idx !== index),
    }));
  };

  const addBeforeAfter = () => {
    setBlog((prev) => ({
      ...prev,
      beforeAfterImages: [
        ...(prev.beforeAfterImages || []),
        { beforeImage: "", afterImage: "", label: "" },
      ],
    }));
  };

  const updateBeforeAfter = (index, field, value) => {
    setBlog((prev) => ({
      ...prev,
      beforeAfterImages: (prev.beforeAfterImages || []).map((entry, idx) =>
        idx === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeBeforeAfter = (index) => {
    setBlog((prev) => ({
      ...prev,
      beforeAfterImages: (prev.beforeAfterImages || []).filter((_, idx) => idx !== index),
    }));
  };

  const validate = () => {
    const issues = [];
    if (!String(blog.title || "").trim()) issues.push("Blog title is required");
    if (!String(blog.category || "").trim()) issues.push("Category is required");
    if (!String(blog.content || "").trim()) issues.push("Content is required");
    if (blog.workflow.status === "scheduled" && !blog.workflow.scheduledFor) {
      issues.push("Scheduled date is required for scheduled status");
    }
    return issues;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setValidationIssues([]);

    const localErrors = validate();
    if (localErrors.length) {
      setError(`Please fix ${localErrors.length} field${localErrors.length > 1 ? "s" : ""} and try again.`);
      setValidationIssues(localErrors);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const payload = {
      title: blog.title,
      slug: blog.slug || toSlug(blog.title),
      excerpt: blog.excerpt || "",
      content: blog.content || "",
      featuredImage: blog.featuredImage || "",
      galleryImages: uniqueStrings(blog.galleryImages || []),
      beforeAfterImages: (blog.beforeAfterImages || []).filter(
        (entry) => String(entry?.beforeImage || "").trim() || String(entry?.afterImage || "").trim()
      ),
      category: blog.category || "Uncategorized",
      tags: uniqueStrings(blog.tags || []),
      faqItems: (blog.faqItems || []).filter(
        (entry) => String(entry?.question || "").trim() && String(entry?.answer || "").trim()
      ),
      seo: {
        metaTitle: blog.seo.metaTitle || "",
        metaDescription: blog.seo.metaDescription || "",
        canonicalUrl: blog.seo.canonicalUrl || "",
        focusKeyword: blog.seo.focusKeyword || "",
        secondaryKeywords: uniqueStrings(blog.seo.secondaryKeywords || []),
        noIndex: Boolean(blog.seo.noIndex),
      },
      workflow: {
        status: blog.workflow.status || "draft",
        approvalRequired: Boolean(blog.workflow.approvalRequired),
        reviewer: blog.workflow.reviewer || "",
        scheduledFor: fromDateInput(blog.workflow.scheduledFor),
        publishedAt: fromDateInput(blog.workflow.publishedAt),
      },
      automation: {
        targetKeyword: blog.automation.targetKeyword || "",
        secondaryKeywords: uniqueStrings(blog.automation.secondaryKeywords || []),
        searchIntent: blog.automation.searchIntent || "",
        targetLocation: blog.automation.targetLocation || "",
        contentBrief: blog.automation.contentBrief || "",
        generationSource: blog.automation.generationSource || "manual",
        generatedDraft: blog.automation.generatedDraft || "",
        lastHumanEditedBy: blog.automation.lastHumanEditedBy || "",
        autoPublishEnabled: Boolean(blog.automation.autoPublishEnabled),
      },
      author: {
        name: blog.author.name || "",
        id: blog.author.id || "",
      },
    };

    try {
      const endpoint = isEdit ? `${API_BASE_URL}/blogs/${id}` : `${API_BASE_URL}/blogs`;
      const method = isEdit ? "PUT" : "POST";
      const resp = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const parsed = parseApiError(data, "Unable to save blog post.");
        setError(parsed.summary);
        setValidationIssues(parsed.issues);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      navigate("/admin/blogs");
    } catch (err) {
      setError(err?.message || "Unable to save blog post");
      setValidationIssues([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header fancy">
        <div>
          <h2>{isEdit ? "Edit Blog Post" : "Create Blog Post"}</h2>
          <p className="muted">Built for manual publishing today and automation tomorrow.</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => navigate("/admin/blogs")}>
          ← Back
        </button>
      </div>

      {error && (
        <div className="error-panel" role="alert" aria-live="polite">
          <p className="error-panel-title">{error}</p>
          {validationIssues.length > 0 ? (
            <ul className="error-panel-list">
              {validationIssues.map((issue, index) => (
                <li key={`${issue}-${index}`}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="card compact product-form-card">
          <div className="section appear">
            <div className="section-title">
              <h3>Core Content</h3>
              <span className="hint">Title, slug, category and editor</span>
            </div>
            <div className="form-table">
              <div className="form-row">
                <div className="form-cell">Title *</div>
                <div className="form-cell">
                  <input name="title" value={blog.title} onChange={handleRoot} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-cell">Slug</div>
                <div className="form-cell">
                  <input
                    name="slug"
                    value={blog.slug}
                    onChange={(event) =>
                      setBlog((prev) => ({ ...prev, slug: toSlug(event.target.value) }))
                    }
                    placeholder="auto-generated-from-title"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-cell">Category *</div>
                <div className="form-cell">
                  <input name="category" value={blog.category} onChange={handleRoot} placeholder="Sunscreen" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-cell">Excerpt</div>
                <div className="form-cell">
                  <textarea name="excerpt" rows={3} value={blog.excerpt} onChange={handleRoot} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-cell">Rich Text Editor *</div>
                <div className="form-cell">
                  <div className="actions" style={{ marginBottom: 8 }}>
                    <button type="button" className="btn ghost" onClick={() => exec("bold")}>Bold</button>
                    <button type="button" className="btn ghost" onClick={() => exec("italic")}>Italic</button>
                    <button type="button" className="btn ghost" onClick={() => exec("insertUnorderedList")}>Bullet List</button>
                    <button type="button" className="btn ghost" onClick={() => exec("formatBlock", "<h2>")}>H2</button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        const url = window.prompt("Enter URL");
                        if (url) exec("createLink", url);
                      }}
                    >
                      Link
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) =>
                      setBlog((prev) => ({ ...prev, content: event.currentTarget.innerHTML }))
                    }
                    style={{
                      minHeight: "220px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: "12px",
                      background: "#fff",
                    }}
                  />
                  <div className="subtext">Supports rich text formatting. Saved as HTML for frontend rendering.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="section appear delay-1">
            <div className="section-title">
              <h3>Media</h3>
              <span className="hint">Featured image, gallery, before/after pairs</span>
            </div>
            <div className="form-table">
              <div className="form-row">
                <div className="form-cell">Featured Image</div>
                <div className="form-cell">
                  <input
                    name="featuredImage"
                    type="url"
                    value={blog.featuredImage}
                    onChange={handleRoot}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-cell">Gallery Images</div>
                <div className="form-cell">
                  <div className="image-input-row image-input-row-three">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newGalleryUrl}
                      onChange={(event) => setNewGalleryUrl(event.target.value)}
                    />
                    <button type="button" className="btn ghost" onClick={addGalleryUrl}>Add URL</button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setBlog((prev) => ({ ...prev, galleryImages: [] }))}
                    >
                      Clear
                    </button>
                  </div>
                  {blog.galleryImages.length > 0 ? (
                    <div className="image-grid">
                      {blog.galleryImages.map((url, index) => (
                        <div className="image-tile" key={`${url}-${index}`}>
                          <img src={url} alt={`gallery-${index + 1}`} />
                          <button type="button" className="image-remove" onClick={() => removeGalleryUrl(index)}>x</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="image-empty">No gallery images yet.</div>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-cell">Before / After</div>
                <div className="form-cell">
                  <button type="button" className="btn secondary" onClick={addBeforeAfter}>+ Add Pair</button>
                  {(blog.beforeAfterImages || []).map((entry, index) => (
                    <div key={`before-after-${index}`} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <input
                        type="url"
                        placeholder="Before image URL"
                        value={entry.beforeImage || ""}
                        onChange={(event) => updateBeforeAfter(index, "beforeImage", event.target.value)}
                      />
                      <input
                        type="url"
                        placeholder="After image URL"
                        value={entry.afterImage || ""}
                        onChange={(event) => updateBeforeAfter(index, "afterImage", event.target.value)}
                      />
                      <input
                        placeholder="Label (optional)"
                        value={entry.label || ""}
                        onChange={(event) => updateBeforeAfter(index, "label", event.target.value)}
                      />
                      <div className="actions">
                        <button type="button" className="btn danger" onClick={() => removeBeforeAfter(index)}>
                          Remove Pair
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="section appear delay-1">
            <div className="section-title">
              <h3>SEO + FAQ</h3>
              <span className="hint">Meta fields and question/answer blocks</span>
            </div>
            <div className="form-table">
              <div className="form-row"><div className="form-cell">Meta Title</div><div className="form-cell"><input name="metaTitle" value={blog.seo.metaTitle} onChange={handleSeo} /></div></div>
              <div className="form-row"><div className="form-cell">Meta Description</div><div className="form-cell"><textarea name="metaDescription" rows={3} value={blog.seo.metaDescription} onChange={handleSeo} /></div></div>
              <div className="form-row"><div className="form-cell">Canonical URL</div><div className="form-cell"><input name="canonicalUrl" type="url" value={blog.seo.canonicalUrl} onChange={handleSeo} placeholder="https://www.neesmedical.com/blog/..." /></div></div>
              <div className="form-row"><div className="form-cell">Focus Keyword</div><div className="form-cell"><input name="focusKeyword" value={blog.seo.focusKeyword} onChange={handleSeo} /></div></div>
              <div className="form-row"><div className="form-cell">Secondary Keywords</div><div className="form-cell"><input value={(blog.seo.secondaryKeywords || []).join(", ")} onChange={(event) => setBlog((prev) => ({ ...prev, seo: { ...prev.seo, secondaryKeywords: uniqueStrings(event.target.value) } }))} placeholder="comma separated" /></div></div>
              <div className="form-row"><div className="form-cell">No Index</div><div className="form-cell"><input name="noIndex" type="checkbox" checked={Boolean(blog.seo.noIndex)} onChange={handleSeo} /></div></div>
              <div className="form-row">
                <div className="form-cell">FAQs</div>
                <div className="form-cell">
                  <button type="button" className="btn secondary" onClick={addFaq}>+ Add FAQ</button>
                  {(blog.faqItems || []).map((entry, index) => (
                    <div key={`faq-${index}`} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <input
                        placeholder="Question"
                        value={entry.question || ""}
                        onChange={(event) => updateFaq(index, "question", event.target.value)}
                      />
                      <textarea
                        rows={3}
                        placeholder="Answer"
                        value={entry.answer || ""}
                        onChange={(event) => updateFaq(index, "answer", event.target.value)}
                      />
                      <div className="actions">
                        <button type="button" className="btn danger" onClick={() => removeFaq(index)}>
                          Remove FAQ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="section appear delay-1">
            <div className="section-title">
              <h3>Workflow + Automation</h3>
              <span className="hint">Scheduling, approvals, and metadata for future auto publishing</span>
            </div>
            <div className="form-table">
              <div className="form-row"><div className="form-cell">Status</div><div className="form-cell"><select name="status" value={blog.workflow.status} onChange={handleWorkflow}><option value="draft">draft</option><option value="review">review</option><option value="approved">approved</option><option value="scheduled">scheduled</option><option value="published">published</option></select></div></div>
              <div className="form-row"><div className="form-cell">Scheduled For</div><div className="form-cell"><input type="datetime-local" name="scheduledFor" value={blog.workflow.scheduledFor || ""} onChange={handleWorkflow} /></div></div>
              <div className="form-row"><div className="form-cell">Published At</div><div className="form-cell"><input type="datetime-local" name="publishedAt" value={blog.workflow.publishedAt || ""} onChange={handleWorkflow} /></div></div>
              <div className="form-row"><div className="form-cell">Approval Required</div><div className="form-cell"><input type="checkbox" name="approvalRequired" checked={Boolean(blog.workflow.approvalRequired)} onChange={handleWorkflow} /></div></div>
              <div className="form-row"><div className="form-cell">Reviewer</div><div className="form-cell"><input name="reviewer" value={blog.workflow.reviewer} onChange={handleWorkflow} /></div></div>
              <div className="form-row"><div className="form-cell">Target Keyword</div><div className="form-cell"><input name="targetKeyword" value={blog.automation.targetKeyword} onChange={handleAutomation} /></div></div>
              <div className="form-row"><div className="form-cell">Secondary Keywords</div><div className="form-cell"><input value={(blog.automation.secondaryKeywords || []).join(", ")} onChange={(event) => setBlog((prev) => ({ ...prev, automation: { ...prev.automation, secondaryKeywords: uniqueStrings(event.target.value) } }))} placeholder="comma separated" /></div></div>
              <div className="form-row"><div className="form-cell">Search Intent</div><div className="form-cell"><input name="searchIntent" value={blog.automation.searchIntent} onChange={handleAutomation} placeholder="informational / commercial" /></div></div>
              <div className="form-row"><div className="form-cell">Target Location</div><div className="form-cell"><input name="targetLocation" value={blog.automation.targetLocation} onChange={handleAutomation} placeholder="Lahore, Pakistan" /></div></div>
              <div className="form-row"><div className="form-cell">Content Brief</div><div className="form-cell"><textarea rows={4} name="contentBrief" value={blog.automation.contentBrief} onChange={handleAutomation} /></div></div>
              <div className="form-row"><div className="form-cell">Generation Source</div><div className="form-cell"><input name="generationSource" value={blog.automation.generationSource} onChange={handleAutomation} placeholder="manual / ai / import" /></div></div>
              <div className="form-row"><div className="form-cell">Generated Draft</div><div className="form-cell"><textarea rows={4} name="generatedDraft" value={blog.automation.generatedDraft} onChange={handleAutomation} /></div></div>
              <div className="form-row"><div className="form-cell">Last Human Edited By</div><div className="form-cell"><input name="lastHumanEditedBy" value={blog.automation.lastHumanEditedBy} onChange={handleAutomation} /></div></div>
              <div className="form-row"><div className="form-cell">Auto Publish Enabled</div><div className="form-cell"><input type="checkbox" name="autoPublishEnabled" checked={Boolean(blog.automation.autoPublishEnabled)} onChange={handleAutomation} /></div></div>
            </div>
          </div>

          <div className="section appear delay-1">
            <div className="section-title">
              <h3>Author + Taxonomy</h3>
              <span className="hint">Ownership and classification</span>
            </div>
            <div className="form-table">
              <div className="form-row"><div className="form-cell">Author Name</div><div className="form-cell"><input name="name" value={blog.author.name} onChange={handleAuthor} /></div></div>
              <div className="form-row"><div className="form-cell">Author ID</div><div className="form-cell"><input name="id" value={blog.author.id} onChange={handleAuthor} /></div></div>
              <div className="form-row"><div className="form-cell">Tags</div><div className="form-cell"><input value={(blog.tags || []).join(", ")} onChange={(event) => setBlog((prev) => ({ ...prev, tags: uniqueStrings(event.target.value) }))} placeholder="skincare, sunscreen, lahore" /></div></div>
              <div className="form-row"><div className="form-cell">Estimated Reading Time</div><div className="form-cell"><strong>{autoReadMinutes || 0} min</strong></div></div>
            </div>
          </div>

          <div className="sticky-actions">
            <div className="actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Blog Post"}
              </button>
              <button className="btn secondary" type="button" onClick={() => navigate("/admin/blogs")}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default BlogForm;
