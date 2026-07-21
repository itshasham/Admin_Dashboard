import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { BookOpenText, LayoutDashboard, LogOut, Package, ShoppingBag, Stethoscope } from "lucide-react";

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
const AccessoryList = lazy(() => import("./pages/accessories/AccessoryList"));
const AccessoryForm = lazy(() => import("./pages/accessories/AccessoryForm"));
const BlogList = lazy(() => import("./pages/blogs/BlogList"));
const BlogForm = lazy(() => import("./pages/blogs/BlogForm"));
const TrainingEventList = lazy(() => import("./pages/training-events/TrainingEventList"));
const TrainingEventForm = lazy(() => import("./pages/training-events/TrainingEventForm"));
const TrainingEventRegistrations = lazy(() =>
  import("./pages/training-events/TrainingEventRegistrations")
);

const OrderList = lazy(() => import("./pages/orders/OrderList"));
const OrderDetail = lazy(() => import("./pages/orders/OrderDetail"));

const UserList = lazy(() => import("./pages/users/UserList"));

const CouponList = lazy(() => import("./pages/coupons/CouponList"));
const CouponForm = lazy(() => import("./pages/coupons/CouponForm"));

const CloudinaryPage = lazy(() => import("./pages/cloudinary/CloudinaryPage"));
const ContactUsList = lazy(() => import("./pages/contacts/ContactUsList"));
const GoogleMapLinkList = lazy(() => import("./pages/google-map-links/GoogleMapLinkList"));

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

const AdminTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      document.title = "NEES Medical Admin";
    }
  }, [location.pathname]);

  return null;
};

const AdminGlobalNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isAuthRoute = [
    "/admin/login",
    "/admin/register",
    "/admin/forgot-password",
    "/admin/reset-password",
  ].some((route) => path === route || path.startsWith(`${route}/`));

  if (!path.startsWith("/admin") || isAuthRoute || path === "/admin/dashboard") return null;

  let adminName = "Administrator";
  let adminRole = "Admin";
  try {
    const raw = localStorage.getItem("adminData");
    const data = raw ? JSON.parse(raw) : null;
    adminName = data?.name || adminName;
    adminRole = data?.role || adminRole;
  } catch {
    // Keep a safe fallback when browser storage is unavailable.
  }

  const links = [
    { label: "Overview", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
    { label: "Retail", path: "/admin/products", icon: Package },
    { label: "Clinical", path: "/admin/clinical-products", icon: Stethoscope },
    { label: "Content", path: "/admin/blogs", icon: BookOpenText },
  ];

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    navigate("/admin/login", { replace: true });
  };

  return (
    <>
      <header className="admin-page-nav">
        <button type="button" className="admin-page-nav-brand" onClick={() => navigate("/admin/dashboard")}>
          <span className="admin-page-nav-mark">N</span>
          <span>
            <strong>NEES Medical</strong>
            <small>Admin workspace</small>
          </span>
        </button>
        <nav className="admin-page-nav-links" aria-label="Admin shortcuts">
          {links.map(({ label, path: target, icon: Icon }) => {
            const active = path === target || (target !== "/admin/dashboard" && path.startsWith(`${target}/`));
            return (
              <button
                key={target}
                type="button"
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(target)}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="admin-page-nav-account">
          <span><strong>{adminName}</strong><small>{adminRole}</small></span>
          <button type="button" onClick={logout} aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </header>
      <nav className="admin-page-mobile-dock" aria-label="Mobile admin shortcuts">
        {links.slice(0, 4).map(({ label, path: target, icon: Icon }) => {
          const active = path === target || (target !== "/admin/dashboard" && path.startsWith(`${target}/`));
          return (
            <button
              key={target}
              type="button"
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(target)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AdminTitleManager />
      <AdminGlobalNavigation />
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
          <Route
            path="/admin/categories"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><CategoryList /></ProtectedRoute>}
          />
          <Route
            path="/admin/categories/new"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><CategoryForm /></ProtectedRoute>}
          />
          <Route
            path="/admin/categories/:id"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><CategoryForm /></ProtectedRoute>}
          />

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
          <Route path="/admin/accessories" element={<ProtectedRoute><AccessoryList /></ProtectedRoute>} />
          <Route path="/admin/accessories/new" element={<ProtectedRoute><AccessoryForm /></ProtectedRoute>} />
          <Route path="/admin/accessories/:id" element={<ProtectedRoute><AccessoryForm /></ProtectedRoute>} />
          <Route path="/admin/blogs" element={<ProtectedRoute><BlogList /></ProtectedRoute>} />
          <Route path="/admin/blogs/new" element={<ProtectedRoute><BlogForm /></ProtectedRoute>} />
          <Route path="/admin/blogs/:id" element={<ProtectedRoute><BlogForm /></ProtectedRoute>} />
          <Route path="/admin/training-events" element={<ProtectedRoute><TrainingEventList /></ProtectedRoute>} />
          <Route path="/admin/training-events/new" element={<ProtectedRoute><TrainingEventForm /></ProtectedRoute>} />
          <Route
            path="/admin/training-events/registrations"
            element={<ProtectedRoute><TrainingEventRegistrations /></ProtectedRoute>}
          />
          <Route path="/admin/training-events/:id" element={<ProtectedRoute><TrainingEventForm /></ProtectedRoute>} />
          <Route
            path="/admin/training-events/:id/registrations"
            element={<ProtectedRoute><TrainingEventRegistrations /></ProtectedRoute>}
          />

          {/* Order Management (protected) */}
          <Route path="/admin/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
          <Route path="/admin/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

          {/* User Management (protected) */}
          <Route path="/admin/users" element={<ProtectedRoute><UserList /></ProtectedRoute>} />

          {/* Coupon Management (protected) */}
          <Route
            path="/admin/coupons"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><CouponList /></ProtectedRoute>}
          />
          <Route
            path="/admin/coupons/new"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><CouponForm /></ProtectedRoute>}
          />
          <Route
            path="/admin/coupons/:id"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><CouponForm /></ProtectedRoute>}
          />

          {/* Cloudinary (protected) */}
          <Route path="/admin/cloudinary" element={<ProtectedRoute><CloudinaryPage /></ProtectedRoute>} />
          <Route
            path="/admin/contact-us"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><ContactUsList /></ProtectedRoute>}
          />
          <Route
            path="/admin/google-map-links"
            element={<ProtectedRoute allowedRoles={["Manager", "CEO"]}><GoogleMapLinkList /></ProtectedRoute>}
          />
          
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
