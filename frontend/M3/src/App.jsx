import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

// Lazy-loaded pages to reduce initial bundle
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const AdminForgotPassword = lazy(() => import("./pages/AdminForgotPassword"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminStaff = lazy(() => import("./pages/AdminStaff"));

const BrandList = lazy(() => import("./pages/brands/BrandList"));
const BrandForm = lazy(() => import("./pages/brands/BrandForm"));

const CategoryList = lazy(() => import("./pages/categories/CategoryList"));
const CategoryForm = lazy(() => import("./pages/categories/CategoryForm"));

const ProductList = lazy(() => import("./pages/products/ProductList"));
const ProductForm = lazy(() => import("./pages/products/ProductForm"));
const ClinicalProductList = lazy(() => import("./pages/clinical-products/ClinicalProductList"));
const ClinicalProductForm = lazy(() => import("./pages/clinical-products/ClinicalProductForm"));
const MachineList = lazy(() => import("./pages/machines/MachineList"));
const MachineForm = lazy(() => import("./pages/machines/MachineForm"));

const OrderList = lazy(() => import("./pages/orders/OrderList"));
const OrderDetail = lazy(() => import("./pages/orders/OrderDetail"));

const UserList = lazy(() => import("./pages/users/UserList"));

const CouponList = lazy(() => import("./pages/coupons/CouponList"));
const CouponForm = lazy(() => import("./pages/coupons/CouponForm"));

const CloudinaryPage = lazy(() => import("./pages/cloudinary/CloudinaryPage"));

import ProtectedRoute from "./components/ProtectedRoute";

const RedirectToResetPassword = () => {
  const { token } = useParams();
  return <Navigate to={`/admin/reset-password/${token}`} replace />;
};

const RootRedirect = () => {
  let hasToken = false;
  try {
    hasToken = Boolean(localStorage.getItem("adminToken"));
  } catch {
    hasToken = false;
  }
  return <Navigate to={hasToken ? "/admin/dashboard" : "/admin/login"} replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
        <Routes>
          {/* Root: decide where to go based on auth */}
          <Route path="/" element={<RootRedirect />} />
          {/* Public auth routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password/:token" element={<AdminResetPassword />} />

          {/* Protected admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute><AdminStaff /></ProtectedRoute>} />

          {/* Brand Management (protected) */}
          <Route path="/admin/brands" element={<ProtectedRoute><BrandList /></ProtectedRoute>} />
          <Route path="/admin/brands/new" element={<ProtectedRoute><BrandForm /></ProtectedRoute>} />
          <Route path="/admin/brands/:id" element={<ProtectedRoute><BrandForm /></ProtectedRoute>} />

          {/* Category Management (protected) */}
          <Route path="/admin/categories" element={<ProtectedRoute><CategoryList /></ProtectedRoute>} />
          <Route path="/admin/categories/new" element={<ProtectedRoute><CategoryForm /></ProtectedRoute>} />
          <Route path="/admin/categories/:id" element={<ProtectedRoute><CategoryForm /></ProtectedRoute>} />

          {/* Product Management (protected) */}
          <Route path="/admin/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
          <Route path="/admin/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
          <Route path="/admin/products/:id" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
          <Route path="/admin/clinical-products" element={<ProtectedRoute><ClinicalProductList /></ProtectedRoute>} />
          <Route path="/admin/clinical-products/new" element={<ProtectedRoute><ClinicalProductForm /></ProtectedRoute>} />
          <Route path="/admin/clinical-products/:id" element={<ProtectedRoute><ClinicalProductForm /></ProtectedRoute>} />
          <Route path="/admin/machines" element={<ProtectedRoute><MachineList /></ProtectedRoute>} />
          <Route path="/admin/machines/new" element={<ProtectedRoute><MachineForm /></ProtectedRoute>} />
          <Route path="/admin/machines/:id" element={<ProtectedRoute><MachineForm /></ProtectedRoute>} />

          {/* Order Management (protected) */}
          <Route path="/admin/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
          <Route path="/admin/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

          {/* User Management (protected) */}
          <Route path="/admin/users" element={<ProtectedRoute><UserList /></ProtectedRoute>} />

          {/* Coupon Management (protected) */}
          <Route path="/admin/coupons" element={<ProtectedRoute><CouponList /></ProtectedRoute>} />
          <Route path="/admin/coupons/new" element={<ProtectedRoute><CouponForm /></ProtectedRoute>} />
          <Route path="/admin/coupons/:id" element={<ProtectedRoute><CouponForm /></ProtectedRoute>} />

          {/* Cloudinary (protected) */}
          <Route path="/admin/cloudinary" element={<ProtectedRoute><CloudinaryPage /></ProtectedRoute>} />
          
          {/* Redirect route for email links */}
          <Route path="/forget-password/:token" element={<RedirectToResetPassword />} />

          {/* Optional: catch-all to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
