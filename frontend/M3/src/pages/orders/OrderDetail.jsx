import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "./order.css";
import { API_BASE_URL } from '../../config/api';

const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024;
const MAX_PAYMENT_PROOF_IMAGES = 5;
const ALLOWED_PAYMENT_PROOF_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [role, setRole] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentVerificationStatus, setPaymentVerificationStatus] = useState("pending");
  const [paymentReceivedAmount, setPaymentReceivedAmount] = useState("");
  const [paymentReceivedMethod, setPaymentReceivedMethod] = useState("");
  const [paymentReceivedIn, setPaymentReceivedIn] = useState("");
  const [paymentTransactionReference, setPaymentTransactionReference] = useState("");
  const [paymentVerificationNotes, setPaymentVerificationNotes] = useState("");
  const [paymentProofImages, setPaymentProofImages] = useState([]);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [paymentUploadProgress, setPaymentUploadProgress] = useState(0);
  const [draggingProofs, setDraggingProofs] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const paymentProofInputRef = useRef(null);
  const paymentProofImagesRef = useRef([]);
  const courierCompanies = ["DHL", "TCS", "FedEx", "Blue Dart", "Leopards", "PostEx", "Local"];
  const normalizeStatus = (value) => {
    const statusValue = String(value || "").toLowerCase();
    if (statusValue === "cancelled" || statusValue === "canceled") return "cancel";
    if (statusValue === "delivered" || statusValue === "dispatched") return "dispatch";
    return statusValue || "pending";
  };
  const normalizeCourierKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s._-]+/g, "");
  const isLocalDeliveryCourier = (value) => {
    const key = normalizeCourierKey(value);
    return key === "local" || key === "localdelivery";
  };
  const isOnlinePaymentMethod = (value = "") => {
    const normalized = String(value || "").toLowerCase().trim();
    if (!normalized) return false;
    if (
      normalized.includes("cod") ||
      normalized.includes("cash on delivery") ||
      normalized.includes("offline")
    ) {
      return false;
    }
    return (
      normalized.includes("online") ||
      normalized.includes("card") ||
      normalized.includes("wallet") ||
      normalized.includes("bank") ||
      normalized.includes("stripe") ||
      normalized.includes("paypal") ||
      normalized.includes("jazzcash") ||
      normalized.includes("easypaisa")
    );
  };
  const isProofUploadEnabled = () =>
    String(paymentVerificationStatus || "").toLowerCase() === "verified" &&
    String(paymentReceivedMethod || "").toLowerCase() === "online";
  const fmtFileSize = (size = 0) => {
    const value = Number(size || 0);
    if (!Number.isFinite(value) || value <= 0) return "—";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  };
  const getProofKey = (proof = {}) => String(proof?.publicId || proof?.url || "").trim();
  const normalizeExistingProofImages = (proofImages = []) =>
    proofImages
      .filter((item) => String(item?.url || "").trim())
      .map((item, idx) => ({
        id: `existing-${idx}-${Date.now()}`,
        source: "existing",
        url: String(item.url || "").trim(),
        publicId: String(item.publicId || "").trim(),
        originalName: String(item.originalName || "Proof Image"),
        mimeType: String(item.mimeType || ""),
        size: Number(item.size || 0),
        uploadedAt: item.uploadedAt || null,
        file: null,
      }));
  const revokeObjectUrlIfNeeded = (proofItem = {}) => {
    if (proofItem?.source === "new" && String(proofItem?.url || "").startsWith("blob:")) {
      URL.revokeObjectURL(proofItem.url);
    }
  };
  const createProofItemFromFile = (file) => ({
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: "new",
    url: URL.createObjectURL(file),
    publicId: "",
    originalName: String(file?.name || "proof-image"),
    mimeType: String(file?.type || ""),
    size: Number(file?.size || 0),
    uploadedAt: new Date().toISOString(),
    file,
  });
  const validateProofFile = (file) => {
    const fileType = String(file?.type || "").toLowerCase();
    if (!ALLOWED_PAYMENT_PROOF_TYPES.has(fileType)) {
      return "Only JPG, JPEG, PNG, and WEBP images are supported.";
    }
    if (Number(file?.size || 0) > MAX_PAYMENT_PROOF_SIZE) {
      return "Each image must be 5MB or less.";
    }
    return "";
  };
  const tryCompressProofImage = (file) =>
    new Promise((resolve) => {
      try {
        if (!file || Number(file.size || 0) < 1.8 * 1024 * 1024) {
          resolve(file);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxDimension = 1800;
            const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * ratio));
            canvas.height = Math.max(1, Math.round(img.height * ratio));
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (!blob || blob.size >= file.size) {
                  resolve(file);
                  return;
                }
                const compressed = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressed);
              },
              "image/jpeg",
              0.82
            );
          };
          img.onerror = () => resolve(file);
          img.src = String(reader.result || "");
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      } catch {
        resolve(file);
      }
    });

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const appendProofFiles = async (incomingFiles = []) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length) return;

    setPaymentProofError("");
    const previousCount = paymentProofImagesRef.current.length;
    const availableSlots = Math.max(0, MAX_PAYMENT_PROOF_IMAGES - previousCount);
    if (availableSlots <= 0) {
      setPaymentProofError(`Maximum ${MAX_PAYMENT_PROOF_IMAGES} proof images are allowed.`);
      return;
    }

    const acceptedFiles = files.slice(0, availableSlots);
    const rejectedMessages = [];
    const nextItems = [];

    for (const file of acceptedFiles) {
      const validationError = validateProofFile(file);
      if (validationError) {
        rejectedMessages.push(`${file?.name || "File"}: ${validationError}`);
        continue;
      }
      const optimizedFile = await tryCompressProofImage(file);
      const optimizedValidationError = validateProofFile(optimizedFile);
      if (optimizedValidationError) {
        rejectedMessages.push(`${file?.name || "File"}: ${optimizedValidationError}`);
        continue;
      }
      nextItems.push(createProofItemFromFile(optimizedFile));
    }

    if (files.length > availableSlots) {
      rejectedMessages.push(`Only ${availableSlots} more image(s) can be added.`);
    }

    if (rejectedMessages.length) {
      setPaymentProofError(rejectedMessages.join(" "));
    }

    if (nextItems.length) {
      setPaymentProofImages((prev) => [...prev, ...nextItems]);
    }
  };

  const removeProofImageById = (itemId) => {
    setPaymentProofImages((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (target) revokeObjectUrlIfNeeded(target);
      return prev.filter((item) => item.id !== itemId);
    });
  };

  const clearNewProofImages = () => {
    setPaymentProofImages((prev) => {
      prev.filter((item) => item.source === "new").forEach(revokeObjectUrlIfNeeded);
      return prev.filter((item) => item.source !== "new");
    });
  };

  const moveProofImage = (fromIndex, direction) => {
    setPaymentProofImages((prev) => {
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleProofInputChange = async (event) => {
    if (!isProofUploadEnabled()) return;
    const files = event?.target?.files;
    await appendProofFiles(files);
    if (paymentProofInputRef.current) {
      paymentProofInputRef.current.value = "";
    }
  };

  const handleProofDrop = async (event) => {
    event.preventDefault();
    setDraggingProofs(false);
    if (!isProofUploadEnabled()) return;
    await appendProofFiles(event?.dataTransfer?.files || []);
  };

  const coerceOrder = (payload) => {
    console.log("coerceOrder input:", payload);
    
    if (!payload) {
      console.log("coerceOrder: No payload");
      return null;
    }
    
    if (payload.order) {
      console.log("coerceOrder: Found payload.order");
      return payload.order;
    }
    
    if (payload.data && !Array.isArray(payload.data)) {
      console.log("coerceOrder: Found payload.data (object)");
      return payload.data;
    }
    
    if (Array.isArray(payload.data) && payload.data.length) {
      console.log("coerceOrder: Found payload.data (array), returning first item");
      return payload.data[0];
    }
    
    if (Array.isArray(payload) && payload.length) {
      console.log("coerceOrder: Payload is array, returning first item");
      return payload[0];
    }
    
    // Handle the case where the payload might be malformed or have unusual structure
    if (typeof payload === 'object') {
      console.log("coerceOrder: Payload is object, checking for order-like structure");
      
      // Check if it has order-like fields even if _id is missing or misplaced
      const hasOrderFields = payload.name || payload.email || payload.cart || payload.totalAmount || payload.invoice;
      if (hasOrderFields) {
        console.log("coerceOrder: Found order-like fields, treating as order");
        return payload;
      }
    }
    
    console.log("coerceOrder: Returning payload as-is");
    return payload;
  };

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoints = [
        `${API_BASE_URL}/order/admin/orders/${id}`,
        `${API_BASE_URL}/order/${id}`,
      ];

      let data = null;
      let loaded = false;
      let lastError = null;

      for (const endpoint of endpoints) {
        const resp = await fetch(endpoint, {
          headers: { ...getAuthHeaders() },
          cache: "no-store",
        });
        const isJson = resp.headers.get("content-type")?.includes("application/json");
        const body = isJson ? await resp.json().catch(() => null) : null;

        if (resp.ok) {
          data = body;
          loaded = true;
          break;
        }

        if (resp.status === 404) {
          lastError = body?.message || "Order not found";
          continue;
        }
        if (resp.status === 403) throw new Error("Forbidden");
        if (resp.status === 401) throw new Error("Unauthorized");
        throw new Error(body?.message || "Failed to load order");
      }

      if (!loaded) {
        throw new Error(lastError || "Order not found");
      }
      
      let ord = coerceOrder(data);
      
      // If the first attempt didn't work, try alternative extraction methods
      if (!ord || (!ord.name && !ord.email && !ord.cart && !ord.totalAmount && !ord.invoice)) {
        // Try different extraction strategies
        if (data && typeof data === 'object') {
          // Strategy 1: Check if data itself is the order
          if (data.name || data.email || data.cart || data.totalAmount || data.invoice) {
            ord = data;
          }
          // Strategy 2: Check for nested structures
          else if (data.result && typeof data.result === 'object') {
            ord = data.result;
          }
          // Strategy 3: Check for array with order data
          else if (Array.isArray(data) && data.length > 0) {
            ord = data[0];
          }
          // Strategy 4: Deep search for order-like object
          else {
            const findOrderInObject = (obj, depth = 0) => {
              if (depth > 3 || !obj || typeof obj !== 'object') return null;
              
              // Check if current object looks like an order
              if (obj.name || obj.email || obj.cart || obj.totalAmount || obj.invoice) {
                return obj;
              }
              
              // Recursively search nested objects
              for (const key in obj) {
                if (typeof obj[key] === 'object') {
                  const found = findOrderInObject(obj[key], depth + 1);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const foundOrder = findOrderInObject(data);
            if (foundOrder) {
              ord = foundOrder;
            }
          }
        }
      }
      
      // More lenient validation - if we have any order-like data, try to use it
      if (ord && typeof ord === 'object') {
        // Check if it has any order-like properties
        const orderFields = ['name', 'email', 'cart', 'totalAmount', 'invoice', 'status', 'address', 'contact', 'city', 'country'];
        const hasOrderFields = orderFields.some(field => ord[field] !== undefined);
        
        if (hasOrderFields) {
          setOrder(ord);
          if (ord?.status) setStatus(normalizeStatus(ord.status));
          setTrackingId(String(ord?.trackingId || ord?.trackingNumber || ""));
          setCourierCompany(String(ord?.courierCompany || ord?.courierName || ""));
          setDeliveryPersonName(String(ord?.deliveryPersonName || ""));
          const paymentVerification = ord?.paymentVerification || {};
          const statusValue =
            String(paymentVerification?.status || "").toLowerCase() === "verified" ||
            paymentVerification?.isVerified === true
              ? "verified"
              : "pending";
          setPaymentVerificationStatus(statusValue);
          setPaymentReceivedAmount(
            paymentVerification?.amountReceived !== undefined && paymentVerification?.amountReceived !== null
              ? String(paymentVerification.amountReceived)
              : String(ord?.totalAmount ?? 0)
          );
          setPaymentReceivedMethod(String(paymentVerification?.receivedMethod || ""));
          setPaymentReceivedIn(String(paymentVerification?.receivedIn || ""));
          setPaymentTransactionReference(String(paymentVerification?.transactionReference || ""));
          setPaymentVerificationNotes(String(paymentVerification?.notes || ""));
          setPaymentProofImages((prev) => {
            prev.forEach(revokeObjectUrlIfNeeded);
            return normalizeExistingProofImages(paymentVerification?.proofImages || []);
          });
          setPaymentProofError("");
          setPaymentUploadProgress(0);
          
        } else {
          // EMERGENCY FALLBACK: If all else fails, create a minimal order object
          const emergencyOrder = {
            _id: id,
            name: ord.name || ord.customerName || "Unknown Customer",
            email: ord.email || ord.customerEmail || "",
            cart: ord.cart || ord.items || [],
            totalAmount: ord.totalAmount || ord.total || 0,
            invoice: ord.invoice || ord.orderNumber || id,
            status: ord.status || "unknown",
            address: ord.address || "",
            contact: ord.contact || ord.phone || "",
            city: ord.city || "",
            country: ord.country || "",
            paymentMethod: ord.paymentMethod || "",
            createdAt: ord.createdAt || new Date().toISOString(),
            updatedAt: ord.updatedAt || new Date().toISOString()
          };
          
          setOrder(emergencyOrder);
          setStatus(normalizeStatus(emergencyOrder.status));
          setTrackingId(String(emergencyOrder?.trackingId || emergencyOrder?.trackingNumber || ""));
          setCourierCompany(String(emergencyOrder?.courierCompany || emergencyOrder?.courierName || ""));
          setDeliveryPersonName(String(emergencyOrder?.deliveryPersonName || ""));
          setPaymentVerificationStatus("pending");
          setPaymentReceivedAmount(String(emergencyOrder?.totalAmount ?? 0));
          setPaymentReceivedMethod("");
          setPaymentReceivedIn("");
          setPaymentTransactionReference("");
          setPaymentVerificationNotes("");
          setPaymentProofImages((prev) => {
            prev.forEach(revokeObjectUrlIfNeeded);
            return [];
          });
          setPaymentProofError("");
          setPaymentUploadProgress(0);
        }
      } else {
        // EMERGENCY FALLBACK: Create minimal order from ID only
        const emergencyOrder = {
          _id: id,
          name: "Unknown Customer",
          email: "",
          cart: [],
          totalAmount: 0,
          invoice: id,
          status: "unknown",
          address: "",
          contact: "",
          city: "",
          country: "",
          paymentMethod: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setOrder(emergencyOrder);
        setStatus(normalizeStatus("unknown"));
        setPaymentVerificationStatus("pending");
        setPaymentReceivedAmount(String(emergencyOrder?.totalAmount ?? 0));
        setPaymentReceivedMethod("");
        setPaymentReceivedIn("");
        setPaymentTransactionReference("");
        setPaymentVerificationNotes("");
        setPaymentProofImages((prev) => {
          prev.forEach(revokeObjectUrlIfNeeded);
          return [];
        });
        setPaymentProofError("");
        setPaymentUploadProgress(0);
      }
    } catch (err) {
      console.error("Failed to load order:", err);
      setError(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const nextStatus = normalizeStatus(selectedStatus);
      const sendStatus = nextStatus === "dispatch" ? "dispatched" : nextStatus;

      if (sendStatus === "dispatched") {
        const courier = String(courierCompany || "").trim();
        const localDelivery = isLocalDeliveryCourier(courier);
        if (!courier) {
          alert("courierCompany is required to mark an order as dispatched.");
          return;
        }
        if (localDelivery && !String(deliveryPersonName || "").trim()) {
          alert("deliveryPersonName is required for local dispatched orders.");
          return;
        }
        if (!localDelivery && !String(trackingId || "").trim()) {
          alert("trackingId is required to mark an order as dispatched.");
          return;
        }
      }

      const normalizedCourierCompany = String(courierCompany || "").trim();
      const isLocalCourier = isLocalDeliveryCourier(normalizedCourierCompany);
      const body = {
        status: sendStatus,
        ...(sendStatus === "dispatched"
          ? {
              courierCompany: normalizedCourierCompany,
              trackingId: isLocalCourier ? "" : String(trackingId).trim(),
              deliveryPersonName: isLocalCourier ? String(deliveryPersonName).trim() : "",
            }
          : {}),
      };

      const updateEndpoints = [
        { url: `${API_BASE_URL}/order/update-status/${id}`, method: "PATCH" },
      ];

      let updated = false;
      let lastError = "Failed to update order";
      for (const target of updateEndpoints) {
        const resp = await fetch(target.url, {
          method: target.method,
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(body),
        });
        const isJson = resp.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await resp.json().catch(() => ({})) : {};

        if (resp.ok) {
          updated = true;
          break;
        }

        if (resp.status === 404) {
          lastError = data?.message || "Order endpoint not found";
          continue;
        }

        throw new Error(data?.message || "Failed to update order");
      }

      if (!updated) throw new Error(lastError);
      await fetchOrder();
    } catch (err) {
      alert(err.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const updatePaymentVerification = async () => {
    if (!id) return;
    if (role !== "CEO") {
      alert("Only CEO can update payment verification.");
      return;
    }

    const verificationStatus = String(paymentVerificationStatus || "pending").toLowerCase() === "verified"
      ? "verified"
      : "pending";

    if (verificationStatus === "verified") {
      if (!String(paymentReceivedMethod || "").trim()) {
        alert("Please select received method (cash or online).");
        return;
      }
      if (!String(paymentReceivedIn || "").trim()) {
        alert("Please enter where payment was received.");
        return;
      }
      if (String(paymentReceivedMethod || "").toLowerCase() === "online" && paymentProofImages.length === 0) {
        setPaymentProofError("Payment proof image is required for online payment verification.");
        alert("Please upload at least one payment proof image.");
        return;
      }
    }

    setPaymentSaving(true);
    setPaymentUploadProgress(0);
    try {
      const payload = {
        status: verificationStatus,
        amountReceived:
          verificationStatus === "verified"
            ? Number(paymentReceivedAmount || 0)
            : 0,
        receivedMethod:
          verificationStatus === "verified"
            ? String(paymentReceivedMethod || "").trim().toLowerCase()
            : "",
        receivedIn:
          verificationStatus === "verified"
            ? String(paymentReceivedIn || "").trim()
            : "",
        transactionReference:
          verificationStatus === "verified"
            ? String(paymentTransactionReference || "").trim()
            : "",
        notes: String(paymentVerificationNotes || "").trim(),
      };
      const proofKeysToKeep = paymentProofImages
        .filter((item) => item.source === "existing")
        .map((item) => getProofKey(item))
        .filter(Boolean);
      const newProofFiles = paymentProofImages
        .filter((item) => item.source === "new" && item.file)
        .map((item) => item.file);

      const formData = new FormData();
      formData.append("status", payload.status);
      formData.append("amountReceived", String(payload.amountReceived));
      formData.append("receivedMethod", payload.receivedMethod);
      formData.append("receivedIn", payload.receivedIn);
      formData.append("transactionReference", payload.transactionReference);
      formData.append("notes", payload.notes);
      formData.append("existingProofImageKeys", JSON.stringify(proofKeysToKeep));
      newProofFiles.forEach((file) => formData.append("paymentProofImages", file));

      const authHeader = getAuthHeaders()?.Authorization;
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PATCH", `${API_BASE_URL}/order/admin/orders/${id}/payment-verification`);
        if (authHeader) {
          xhr.setRequestHeader("Authorization", authHeader);
        }

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          setPaymentUploadProgress(progress);
        };

        xhr.onload = () => {
          let responseJson = {};
          try {
            responseJson = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch {
            responseJson = {};
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(responseJson);
            return;
          }
          reject(new Error(responseJson?.message || "Failed to update payment verification"));
        };

        xhr.onerror = () => reject(new Error("Network error while updating payment verification"));
        xhr.send(formData);
      });

      await fetchOrder();
      setPaymentProofError("");
      alert("Payment verification updated successfully.");
    } catch (err) {
      alert(err.message || "Failed to update payment verification");
    } finally {
      setPaymentSaving(false);
      setPaymentUploadProgress(0);
    }
  };

  const openDeleteModal = () => {
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteSaving) return;
    setDeleteModalOpen(false);
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteError("");
  };

  const deleteOrder = async () => {
    if (!id || role !== "CEO") return;

    if (!deletePassword.trim()) {
      setDeleteError("Enter your CEO password to continue.");
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Type DELETE to confirm permanent removal.");
      return;
    }

    setDeleteSaving(true);
    setDeleteError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/order/admin/orders/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ password: deletePassword }),
      });
      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json().catch(() => ({})) : {};

      if (!resp.ok) {
        throw new Error(data?.message || data?.error || "Failed to delete order");
      }

      alert("Order deleted successfully.");
      window.location.href = "/admin/orders";
    } catch (err) {
      setDeleteError(err.message || "Failed to delete order");
    } finally {
      setDeleteSaving(false);
    }
  };

  const openPrintSlip = async (format = "auto") => {
    if (!order) return;
    if (!["CEO", "Manager", "Admin"].includes(role)) {
      alert("Access denied");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const safe = (v) => String(v ?? "").trim();
    const fmtDate = (d) => { try { return d ? new Date(d).toLocaleString() : ""; } catch { return safe(d); } };

    const orderId = safe(order?._id || id);
    const items = Array.isArray(order?.cart) ? order.cart : [];
    const expectedDelivery =
      order?.expectedDeliveryDate || order?.expectedDelivery || order?.deliveryDate || "";
    const notes = order?.deliveryNotes || order?.orderNote || "";

    const rowsHtml = items
      .map((it, idx) => {
        const name = safe(it?.title || it?.name || it?.product?.title || it?.product || it?.productId || `Item ${idx + 1}`);
        const qty = it?.orderQuantity ?? it?.quantity ?? it?.qty ?? "";
        return `
          <tr>
            <td class="col-name">
              <div class="item-name">${escapeHtml(name)}</div>
            </td>
            <td class="col-qty">${escapeHtml(qty)}</td>
          </tr>
        `;
      })
      .join("");

    // QR code purpose: quick scanning of the Order ID in dispatch/warehouse.
    // Make it "workable" without external services by generating a data URL client-side.
    let qrDataUrl = "";
    try {
      const QRCode = (await import("qrcode")).default;
      qrDataUrl = await QRCode.toDataURL(orderId, {
        margin: 1,
        width: 140,
        color: { dark: "#111111", light: "#ffffff" },
      });
    } catch {
      qrDataUrl = "";
    }

    const pageCss = (() => {
      if (format === "a4") return "@page{size:A4;margin:10mm;}";
      if (format === "thermal") return "@page{size:80mm auto;margin:4mm;}";
      return "@page{size:auto;margin:10mm;}";
    })();

    const doc = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Dispatch Slip - ${escapeHtml(orderId)}</title>
          <style>
            ${pageCss}
            *{box-sizing:border-box}
            body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111;background:#fff}
            .slip{width:100%;max-width:${format === "thermal" ? "80mm" : "190mm"};margin:0 auto;padding:${format === "thermal" ? "0" : "4mm"}}
            .header{display:flex;gap:12px;align-items:center;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:10px}
            .brand{display:flex;flex-direction:column;gap:2px}
            .brand .nees{font-size:22px;font-weight:900;letter-spacing:1.5px;line-height:1}
            .brand .sub{font-size:12px;color:#444;margin-top:2px}
            .qr{width:72px;height:72px;object-fit:contain}
            .title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:10px 0 12px}
            .title h2{margin:0;font-size:16px}
            .title .oid{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
            .box{border:1px solid #ddd;border-radius:10px;padding:10px}
            .box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px}
            .row{display:flex;gap:10px;justify-content:space-between}
            .k{color:#555;font-size:12px}
            .v{font-size:12px;font-weight:600}
            .full{grid-column:1 / -1}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
            th{background:#f6f6f6;font-size:12px;text-align:left}
            td{font-size:12px}
            .col-qty{width:70px;text-align:center;font-weight:700}
            .item-name{font-weight:700}
            .totals{margin-top:10px;border-top:2px solid #111;padding-top:10px}
            .totals .row{align-items:center}
            .totals .v.big{font-size:16px}
            .notes{white-space:pre-wrap}
            .muted{color:#555;font-size:11px}
            @media print{
              body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
              .slip{max-width:none}
            }
          </style>
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <div class="brand">
                <div class="nees">NEES</div>
                <div class="sub">Customer Dispatch Slip</div>
              </div>
              <div style="text-align:right">
                ${qrDataUrl ? `<img class="qr" src="${escapeHtml(qrDataUrl)}" alt="Order QR" />` : `<div class="qr" style="display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:10px;font-size:11px">QR</div>`}
                <div class="muted" style="margin-top:4px">Scan: Order ID</div>
              </div>
            </div>

            <div class="title">
              <h2>Order Dispatch Slip</h2>
              <div class="oid">Order ID: ${escapeHtml(orderId)}</div>
            </div>

            <div class="grid">
              <div class="box">
                <h3>Customer</h3>
                <div class="row"><div class="k">Name</div><div class="v">${escapeHtml(order?.name || "")}</div></div>
                <div class="row"><div class="k">Contact</div><div class="v">${escapeHtml(order?.contact || order?.phoneNumber || "")}</div></div>
                <div class="row"><div class="k">Payment</div><div class="v">${escapeHtml(order?.paymentMethod || "")}</div></div>
              </div>
              <div class="box">
                <h3>Dates</h3>
                <div class="row"><div class="k">Order Date</div><div class="v">${escapeHtml(fmtDate(order?.createdAt))}</div></div>
                ${expectedDelivery ? `<div class="row"><div class="k">Expected Delivery</div><div class="v">${escapeHtml(fmtDate(expectedDelivery))}</div></div>` : `<div class="row"><div class="k">Expected Delivery</div><div class="v muted">—</div></div>`}
              </div>

              <div class="box full">
                <h3>Dispatch To</h3>
                <div class="row"><div class="k">Address</div><div class="v">${escapeHtml(order?.address || "")}</div></div>
                <div class="row"><div class="k">City / Area</div><div class="v">${escapeHtml(order?.city || "")}</div></div>
                <div class="row"><div class="k">Zip</div><div class="v">${escapeHtml(order?.zipCode || "")}</div></div>
              </div>

              <div class="box full">
                <h3>Items</h3>
                <table>
                  <thead>
                    <tr><th>Item</th><th class="col-qty">Qty</th></tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || `<tr><td colspan="2" class="muted">No items</td></tr>`}
                  </tbody>
                </table>

                <div class="totals">
                  <div class="row"><div class="k">Total Amount</div><div class="v big">${escapeHtml(order?.totalAmount ?? "")}</div></div>
                </div>
              </div>

              ${notes ? `
                <div class="box full">
                  <h3>Delivery Notes</h3>
                  <div class="notes">${escapeHtml(notes)}</div>
                </div>
              ` : ``}
            </div>

            <div class="muted" style="margin-top:10px">Printed: ${escapeHtml(fmtDate(new Date().toISOString()))}</div>
          </div>
        </body>
      </html>`;

    // Print via hidden iframe instead of a new tab (avoids about:blank / popup issues).
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "dispatch-slip");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const iwin = iframe.contentWindow;
    const idoc = iframe.contentDocument || iwin?.document;
    if (!iwin || !idoc) {
      document.body.removeChild(iframe);
      alert("Unable to open print view.");
      return;
    }

    idoc.open();
    idoc.write(doc);
    idoc.close();

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch {}
    };

    // Give the browser a moment to layout before printing, and wait for images (QR) to decode.
    setTimeout(async () => {
      try {
        const imgs = Array.from(iwin.document?.images || []);
        await Promise.all(
          imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
        );
        iwin.focus();
        iwin.print();
      } finally {
        iwin.addEventListener?.("afterprint", cleanup, { once: true });
        setTimeout(cleanup, 1500);
      }
    }, 120);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("adminData");
      const parsed = raw ? JSON.parse(raw) : null;
      setRole(String(parsed?.role || ""));
    } catch {
      setRole("");
    }
  }, []);

  useEffect(() => {
    paymentProofImagesRef.current = paymentProofImages;
  }, [paymentProofImages]);

  useEffect(() => {
    return () => {
      paymentProofImagesRef.current.forEach(revokeObjectUrlIfNeeded);
    };
  }, []);

  useEffect(() => {
    const canPastePaymentProof =
      role === "CEO" &&
      isProofUploadEnabled();
    if (!canPastePaymentProof) return undefined;

    const onPaste = async (event) => {
      const clipboardItems = Array.from(event?.clipboardData?.items || []);
      const imageFiles = clipboardItems
        .filter((item) => String(item?.type || "").startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (!imageFiles.length) return;
      event.preventDefault();
      await appendProofFiles(imageFiles);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [role, paymentVerificationStatus, paymentReceivedMethod, paymentProofImages.length]);

  useEffect(() => {
    if (isProofUploadEnabled()) return;
    setDraggingProofs(false);
    setPaymentProofError("");
  }, [paymentVerificationStatus, paymentReceivedMethod]);

  if (role && !["CEO", "Manager", "Admin"].includes(role)) {
    return (
      <div className="page-container">
        <div className="error">
          <h2>Access Denied</h2>
          <p>You don't have permission to view this order.</p>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="page-container">
      <div className="loading">Loading order details...</div>
    </div>
  );
  
  if (error) return (
    <div className="page-container">
      <div className="error">
        <h2>Error Loading Order</h2>
        <p>{error}</p>
        <p>Order ID: {id}</p>
        <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
      </div>
    </div>
  );
  
  if (!order) return (
    <div className="page-container">
      <div className="error">
        <h2>Order Not Found</h2>
        <p>No order data was returned for ID: {id}</p>
        <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
      </div>
    </div>
  );

  // Additional safety check - ensure order has essential data
  if (!order || (!order.name && !order.email && !order.invoice)) {
    console.log("Order failed final safety check:", order);
    return (
      <div className="page-container">
        <div className="error">
          <h2>Invalid Order Data</h2>
          <p>Order data is missing essential fields.</p>
          <p>Order ID: {id}</p>
          <details>
            <summary>Debug Information</summary>
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </details>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
        </div>
      </div>
    );
  }

  const fmtDateTime = (d) => { try { return d ? new Date(d).toLocaleString() : ""; } catch { return d || ""; } };
  const currentStatus = normalizeStatus(order?.status || status);
  const displayStatus = normalizeStatus(status || currentStatus);
  const statusOptions = (() => {
    // Flow: pending -> processing -> dispatch, but cancel is allowed at any step.
    if (currentStatus === "pending") return ["pending", "processing", "cancel"];
    if (currentStatus === "processing") return ["processing", "dispatch", "cancel"];
    if (currentStatus === "dispatch") return ["dispatch", "cancel"];
    if (currentStatus === "cancel") return ["cancel"];
    return ["pending", "processing", "dispatch", "cancel"];
  })();
  const selectedStatus = statusOptions.includes(displayStatus) ? displayStatus : statusOptions[0];
  const canUpdate = !saving && selectedStatus !== currentStatus;
  const statusClass = displayStatus === "dispatch" ? "status-badge status-success" : displayStatus === "processing" ? "status-badge status-info" : displayStatus === "cancel" ? "status-badge status-danger" : "status-badge status-warn";
  const localCourierSelected = isLocalDeliveryCourier(courierCompany);
  const orderCourierName = String(order?.courierCompany || order?.courierName || "").trim();
  const orderIsLocalDelivery = isLocalDeliveryCourier(orderCourierName);
  const orderTrackingLabel = orderIsLocalDelivery ? "N/A (Local Delivery)" : (order?.trackingId || order?.trackingNumber || "—");
  const canViewPaymentVerification = role === "CEO" || role === "Manager";
  const canEditPaymentVerification = role === "CEO";
  const canDeleteOrder = role === "CEO";
  const canShowProofUploader = isProofUploadEnabled();
  const paymentVerificationStatusLabel =
    String(order?.paymentVerification?.status || "").toLowerCase() === "verified" ||
    order?.paymentVerification?.isVerified === true
      ? "Verified"
      : "Unverified";
  const paymentVerificationClass =
    paymentVerificationStatusLabel === "Verified"
      ? "status-badge status-success"
      : "status-badge status-warn";
  const paymentProofCount = Array.isArray(order?.paymentVerification?.proofImages)
    ? order.paymentVerification.proofImages.length
    : 0;
  const paymentVerificationAuditLogs = Array.isArray(order?.paymentVerification?.auditLogs)
    ? [...order.paymentVerification.auditLogs].reverse()
    : [];

  // Wrap the entire render in a try-catch to prevent white screen
  try {
  return (
    <div className="page-container">
      <div className="order-hero">
        <div className="order-hero-meta">
          <h1>Order #{order?.invoice || id}</h1>
          <div className="meta-line">
            <span>Placed: {fmtDateTime(order?.createdAt)}</span>
            <span>Updated: {fmtDateTime(order?.updatedAt)}</span>
          </div>
        </div>
      <div className="order-hero-actions">
          <span className={statusClass}>{displayStatus}</span>
          <select className="select" value={selectedStatus} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {normalizeStatus(selectedStatus) === "dispatch" && currentStatus === "processing" && (
            <>
              <select
                className="select"
                value={courierCompany}
                onChange={(e) => {
                  const nextCourier = e.target.value;
                  setCourierCompany(nextCourier);
                  if (isLocalDeliveryCourier(nextCourier)) {
                    setTrackingId("");
                  } else {
                    setDeliveryPersonName("");
                  }
                }}
              >
                <option value="">Courier Company</option>
                {courierCompanies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {localCourierSelected ? (
                <input
                  className="select"
                  placeholder="Delivery Person Name"
                  value={deliveryPersonName}
                  onChange={(e) => setDeliveryPersonName(e.target.value)}
                />
              ) : (
                <input
                  className="select"
                  placeholder="Tracking ID"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                />
              )}
            </>
          )}
          <button className="btn" disabled={!canUpdate} onClick={updateStatus}>{saving ? "Saving..." : "Update"}</button>
          <button className="btn" onClick={() => openPrintSlip("a4")}>Print Slip</button>
          <button className="btn secondary" onClick={() => openPrintSlip("thermal")}>Thermal Slip</button>
          {canDeleteOrder && (
            <button className="btn danger" onClick={openDeleteModal} disabled={deleteSaving}>
              Delete Order
            </button>
          )}
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back</button>
      </div>
      </div>

      <div className="grid two-col gap-16">
        <div className="card">
          <div className="card-header"><h2>Customer</h2></div>
          <div className="info-grid">
            <div><label>Name</label><p>{order?.name || ""}</p></div>
            <div><label>Email</label><p>{order?.email || ""}</p></div>
            <div><label>Contact</label><p>{order?.contact || ""}</p></div>
            <div><label>Payment</label><p>{order?.paymentMethod || ""}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Delivery</h2></div>
          <div className="info-grid">
            <div className="full"><label>Address</label><p>{order?.address || ""}</p></div>
            <div><label>City</label><p>{order?.city || ""}</p></div>
            <div><label>Country</label><p>{order?.country || ""}</p></div>
            <div><label>Zip Code</label><p>{order?.zipCode || ""}</p></div>
            <div><label>Shipping</label><p>{order?.shippingOption || ""}</p></div>
            <div><label>Courier</label><p>{order?.courierCompany || order?.courierName || "—"}</p></div>
            <div><label>Tracking ID</label><p>{orderTrackingLabel}</p></div>
            <div><label>Delivery Person</label><p>{order?.deliveryPersonName || "—"}</p></div>
          </div>
        </div>
      </div>

      <div className="grid two-col gap-16" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-header"><h2>Amounts</h2></div>
          <div className="amounts">
            <div className="amount-item"><span className="label">Subtotal</span><span className="value">{order?.subTotal ?? 0}</span></div>
            <div className="amount-item"><span className="label">Shipping</span><span className="value">{order?.shippingCost ?? 0}</span></div>
            <div className="amount-item"><span className="label">Discount</span><span className="value">{order?.discount ?? 0}</span></div>
            {order?.coupon?.couponCode || order?.couponCode ? (
              <div className="amount-item"><span className="label">Coupon</span><span className="value">{order?.coupon?.couponCode || order?.couponCode}</span></div>
            ) : null}
            {order?.affiliate?.commissionAmount > 0 ? (
              <div className="amount-item"><span className="label">Affiliate Commission</span><span className="value">{order.affiliate.commissionAmount}</span></div>
            ) : null}
            <div className="amount-item total"><span className="label">Total</span><span className="value">{order?.totalAmount ?? 0}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Summary</h2></div>
          <ul className="summary-list">
            <li><span>Invoice</span><strong>{order?.invoice}</strong></li>
            <li><span>User</span><strong>{order?.user?.name || order?.user?._id || order?.user || "—"}</strong></li>
            <li><span>Items</span><strong>{(order?.cart || []).length}</strong></li>
            <li><span>Status</span><strong className={statusClass}>{displayStatus}</strong></li>
            {order?.affiliate?.commissionAmount > 0 && (
              <li><span>Affiliate</span><strong>{order?.affiliate?.name || "Unassigned"}</strong></li>
            )}
          </ul>
        </div>
      </div>

      {canViewPaymentVerification && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><h2>Payment Verification</h2></div>
          <div className="info-grid">
            <div><label>Order Payment Method</label><p>{order?.paymentMethod || "—"}</p></div>
            <div><label>Order Total</label><p>{order?.totalAmount ?? 0}</p></div>
            <div><label>Verification Status</label><p><span className={paymentVerificationClass}>{paymentVerificationStatusLabel}</span></p></div>
            <div><label>Amount Received</label><p>{order?.paymentVerification?.amountReceived ?? "—"}</p></div>
            <div><label>Received Via</label><p>{order?.paymentVerification?.receivedMethod || "—"}</p></div>
            <div><label>Received In</label><p>{order?.paymentVerification?.receivedIn || "—"}</p></div>
            <div><label>Reference</label><p>{order?.paymentVerification?.transactionReference || "—"}</p></div>
            <div><label>Verified By</label><p>{order?.paymentVerification?.verifiedBy?.name || "—"}</p></div>
            <div><label>Verified At</label><p>{fmtDateTime(order?.paymentVerification?.verifiedAt)}</p></div>
            <div className="full"><label>Notes</label><p>{order?.paymentVerification?.notes || "—"}</p></div>
            <div className="full">
              <label>Verification Audit Log</label>
              {paymentVerificationAuditLogs.length > 0 ? (
                <div className="payment-audit-log">
                  {paymentVerificationAuditLogs.map((entry, index) => (
                    <div className="payment-audit-item" key={`audit-${index}-${entry?.changedAt || ""}`}>
                      <div className="top">
                        <strong>{String(entry?.action || "").toLowerCase() === "verified" ? "Marked Verified" : "Marked Unverified"}</strong>
                        <span>{fmtDateTime(entry?.changedAt)}</span>
                      </div>
                      <div className="meta">
                        <span>By: {entry?.changedBy?.name || "Unknown"}</span>
                        <span>Method: {entry?.receivedMethod || "—"}</span>
                        <span>Amount: {entry?.amountReceived ?? 0}</span>
                        <span>Proofs: {entry?.proofImageCount ?? 0}</span>
                      </div>
                      {entry?.notes ? <p>{entry.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p>—</p>
              )}
            </div>
            {paymentProofCount > 0 && (
              <div className="full">
                <label>Payment Proof Images</label>
                {paymentProofCount > 0 ? (
                  <div className="proof-readonly-grid">
                    {(order?.paymentVerification?.proofImages || []).map((proof, index) => (
                      <button
                        type="button"
                        className="proof-readonly-item"
                        key={`${proof?.publicId || proof?.url || "proof"}-${index}`}
                        onClick={() => setPreviewProofUrl(String(proof?.url || ""))}
                      >
                        <img src={proof?.url} alt={proof?.originalName || `payment-proof-${index + 1}`} />
                        <span>{fmtDateTime(proof?.uploadedAt)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>—</p>
                )}
              </div>
            )}
          </div>

          {canEditPaymentVerification && (
            <div className="payment-verify-form">
              <h3 className="payment-form-title">Update Verification</h3>
              <div className="payment-form-grid">
                <select
                  className="select"
                  value={paymentVerificationStatus}
                  onChange={(e) => setPaymentVerificationStatus(e.target.value)}
                >
                  <option value="pending">Unverified</option>
                  <option value="verified">Verified</option>
                </select>
                <select
                  className="select"
                  value={paymentReceivedMethod}
                  onChange={(e) => setPaymentReceivedMethod(e.target.value)}
                  disabled={paymentVerificationStatus !== "verified"}
                >
                  <option value="">Received Via</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                <input
                  className="select"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount Received"
                  value={paymentReceivedAmount}
                  onChange={(e) => setPaymentReceivedAmount(e.target.value)}
                  disabled={paymentVerificationStatus !== "verified"}
                />
                <input
                  className="select"
                  placeholder="Received In (Cash Counter / Bank / Wallet)"
                  value={paymentReceivedIn}
                  onChange={(e) => setPaymentReceivedIn(e.target.value)}
                  disabled={paymentVerificationStatus !== "verified"}
                />
                <input
                  className="select"
                  placeholder="Transaction Reference (optional)"
                  value={paymentTransactionReference}
                  onChange={(e) => setPaymentTransactionReference(e.target.value)}
                  disabled={paymentVerificationStatus !== "verified"}
                />
              </div>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Notes (optional)"
                value={paymentVerificationNotes}
                onChange={(e) => setPaymentVerificationNotes(e.target.value)}
              />
              {canShowProofUploader && (
                <>
                  <div
                    className={`payment-proof-dropzone ${draggingProofs ? "is-dragging" : ""} ${canShowProofUploader ? "" : "is-disabled"}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!canShowProofUploader) return;
                      setDraggingProofs(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDraggingProofs(false);
                    }}
                    onDrop={handleProofDrop}
                  >
                    <input
                      ref={paymentProofInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleProofInputChange}
                      hidden
                      disabled={!canShowProofUploader || paymentSaving}
                    />
                    <p className="payment-proof-title">Payment Verification Screenshot</p>
                    <p className="payment-proof-subtitle">
                      Drag & drop, paste from clipboard (Ctrl + V), or upload from your device.
                    </p>
                    <div className="payment-proof-controls">
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={!canShowProofUploader || paymentSaving}
                        onClick={() => paymentProofInputRef.current?.click()}
                      >
                        Choose Images
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={paymentSaving || !paymentProofImages.some((item) => item.source === "new")}
                        onClick={clearNewProofImages}
                      >
                        Clear New
                      </button>
                    </div>
                    <p className="payment-proof-hint">
                      Supported: JPG, JPEG, PNG, WEBP. Max size: 5MB each. Up to {MAX_PAYMENT_PROOF_IMAGES} images.
                    </p>
                  </div>

                  {paymentProofError ? <p className="payment-proof-error">{paymentProofError}</p> : null}

                  {paymentProofImages.length > 0 && (
                    <div className="payment-proof-gallery">
                      {paymentProofImages.map((proofItem, index) => (
                        <div className="payment-proof-card" key={proofItem.id}>
                          <button
                            type="button"
                            className="payment-proof-preview-btn"
                            onClick={() => setPreviewProofUrl(proofItem.url)}
                          >
                            <img src={proofItem.url} alt={proofItem.originalName || `proof-${index + 1}`} />
                          </button>
                          <div className="payment-proof-meta">
                            <span className="name">{proofItem.originalName || `Proof ${index + 1}`}</span>
                            <span>{fmtFileSize(proofItem.size)}</span>
                            <span>{fmtDateTime(proofItem.uploadedAt)}</span>
                          </div>
                          <div className="payment-proof-actions">
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => moveProofImage(index, -1)}
                              disabled={index === 0 || paymentSaving}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => moveProofImage(index, 1)}
                              disabled={index === paymentProofImages.length - 1 || paymentSaving}
                            >
                              →
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => removeProofImageById(proofItem.id)}
                              disabled={paymentSaving}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {paymentSaving && canShowProofUploader && (
                <div className="upload-progress-wrap">
                  <div className="upload-progress-bar">
                    <span style={{ width: `${paymentUploadProgress || 10}%` }} />
                  </div>
                  <p>{paymentUploadProgress ? `Uploading ${paymentUploadProgress}%` : "Uploading..."}</p>
                </div>
              )}
              <div className="payment-form-actions">
                <button
                  className="btn"
                  onClick={updatePaymentVerification}
                  disabled={paymentSaving}
                >
                  {paymentSaving ? "Saving..." : "Save Payment Verification"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {previewProofUrl ? (
        <div
          className="proof-preview-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewProofUrl("")}
        >
          <div className="proof-preview-modal-body" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="proof-preview-close" onClick={() => setPreviewProofUrl("")}>
              Close
            </button>
            <img src={previewProofUrl} alt="Payment proof preview" />
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div
          className="order-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-delete-title"
          onClick={closeDeleteModal}
        >
          <div className="order-delete-modal-body" onClick={(event) => event.stopPropagation()}>
            <div className="order-delete-modal-head">
              <div>
                <p className="order-delete-eyebrow">CEO Verification</p>
                <h2 id="order-delete-title">Delete Order #{order?.invoice || id}</h2>
              </div>
              <button
                type="button"
                className="order-delete-close"
                onClick={closeDeleteModal}
                disabled={deleteSaving}
                aria-label="Close delete confirmation"
              >
                ×
              </button>
            </div>
            <p className="order-delete-copy">
              This permanently removes the order from the database. Enter your CEO password and type DELETE to confirm.
            </p>
            <div className="order-delete-fields">
              <label>
                CEO Password
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  disabled={deleteSaving}
                  autoComplete="current-password"
                />
              </label>
              <label>
                Confirmation
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  disabled={deleteSaving}
                  placeholder="Type DELETE"
                />
              </label>
            </div>
            {deleteError ? <p className="order-delete-error">{deleteError}</p> : null}
            <div className="order-delete-actions">
              <button type="button" className="btn secondary" onClick={closeDeleteModal} disabled={deleteSaving}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={deleteOrder} disabled={deleteSaving}>
                {deleteSaving ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h2>Items</h2></div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
              </tr>
            </thead>
            <tbody>
              {(order?.cart || []).map((item, idx) => (
                <tr key={idx}>
                  <td>
                    {item?.img ? (
                      <img className="brand-thumb" src={item.img} alt={item?.title || "item"} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                    ) : (
                      <div className="brand-thumb" style={{ visibility: 'hidden' }} />
                    )}
                  </td>
                  <td>{item?.title || item?.product || item?.productId || "-"}</td>
                  <td>{item?.brand?.name || item?.brand || "-"}</td>
                  <td>{item?.category?.name || item?.category || "-"}</td>
                  <td>{item?.unit || "-"}</td>
                  <td>{item?.orderQuantity ?? item?.quantity ?? "-"}</td>
                  <td>{item?.price ?? "-"}</td>
                  <td>{item?.discount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  } catch (renderError) {
    console.error("Render error:", renderError);
    return (
      <div className="page-container">
        <div className="error">
          <h2>Render Error</h2>
          <p>There was an error rendering the order details.</p>
          <p>Error: {renderError.message}</p>
          <p>Order ID: {id}</p>
          <details>
            <summary>Order Data</summary>
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </details>
          <button className="btn secondary" onClick={() => (window.location.href = "/admin/orders")}>← Back to Orders</button>
        </div>
      </div>
    );
  }
};

export default OrderDetail;
