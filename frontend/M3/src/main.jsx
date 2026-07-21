import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./styles/admin-pages.css";
import { AuthProvider } from "./store/token.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <React.StrictMode>
     <App />
    </React.StrictMode>
  </AuthProvider>
);
