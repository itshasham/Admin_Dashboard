import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  let isAuthed = false;
  try {
    const token = localStorage.getItem("adminToken");
    isAuthed = Boolean(token);
  } catch {
    isAuthed = false;
  }

  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
