const FRIENDLY_FIELD_LABELS = {
  img: "Main image",
  title: "Title",
  unit: "Unit",
  parent: "Parent",
  children: "Children",
  price: "Price",
  discount: "Discount",
  quantity: "Quantity",
  status: "Status",
  productType: "Product type",
  description: "Description",
  imageURLs: "Additional images",
  "brand.name": "Brand",
  "brand.id": "Brand",
  "category.name": "Category",
  "category.id": "Category",
  contactEmail: "Contact email",
  whatsappNumber: "WhatsApp number",
  inquiryOnly: "Inquiry only",
  professionalUseOnly: "Professional use only",
  "offerDate.startDate": "Offer start date",
  "offerDate.endDate": "Offer end date",
};

const toLabel = (path = "") => {
  const normalizedPath = String(path || "").trim().replace(/\[(\d+)\]/g, ".$1");
  if (!normalizedPath) return "";
  if (FRIENDLY_FIELD_LABELS[normalizedPath]) return FRIENDLY_FIELD_LABELS[normalizedPath];
  const leaf = normalizedPath.split(".").pop() || normalizedPath;
  if (FRIENDLY_FIELD_LABELS[leaf]) return FRIENDLY_FIELD_LABELS[leaf];
  return leaf
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
};

const collectIssue = (issues, path, message) => {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return;
  const label = toLabel(path);
  const text = label ? `${label}: ${cleanMessage}` : cleanMessage;
  issues.push(text);
};

const uniqueIssues = (issues) => {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = String(issue || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeSummary = (message, fallbackSummary) => {
  const clean = String(message || "").trim();
  if (!clean) return fallbackSummary;
  if (clean.toLowerCase() === "validation error") return fallbackSummary;
  return clean;
};

export const parseApiError = (payload, fallbackSummary = "Please review the form and try again.") => {
  const issues = [];

  if (Array.isArray(payload?.errorMessages)) {
    payload.errorMessages.forEach((entry) => {
      collectIssue(issues, entry?.path, entry?.message || entry?.msg);
    });
  }

  if (payload?.errors && typeof payload.errors === "object") {
    Object.entries(payload.errors).forEach(([path, detail]) => {
      if (Array.isArray(detail)) {
        detail.forEach((item) => {
          if (typeof item === "string") collectIssue(issues, path, item);
          else collectIssue(issues, path, item?.message || item?.msg);
        });
        return;
      }
      if (typeof detail === "string") {
        collectIssue(issues, path, detail);
        return;
      }
      collectIssue(issues, path, detail?.message || detail?.msg);
    });
  }

  if (Array.isArray(payload?.details)) {
    payload.details.forEach((detail) => {
      collectIssue(issues, detail?.path, detail?.message || detail?.msg);
    });
  }

  const normalizedIssues = uniqueIssues(issues);
  const summary =
    normalizedIssues.length > 0
      ? `Please fix ${normalizedIssues.length} field${normalizedIssues.length === 1 ? "" : "s"} and try again.`
      : normalizeSummary(payload?.message || payload?.error, fallbackSummary);

  return { summary, issues: normalizedIssues };
};

