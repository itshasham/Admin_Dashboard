import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  let isAuthed = false;
  let role = "";
  try {
    const token = localStorage.getItem("adminToken");
    const raw = localStorage.getItem("adminData");
    const parsed = raw ? JSON.parse(raw) : null;
    isAuthed = Boolean(token);
    role = String(parsed?.role || "");
  } catch {
    isAuthed = false;
    role = "";
  }

  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(role);
    if (!hasAccess) {
      return <Navigate to="/admin/dashboard" replace state={{ denied: location.pathname }} />;
    }
  }

  return children;
};

export default ProtectedRoute;
