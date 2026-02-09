import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [d1, setData1] = useState(null);

  const userAuthentication = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.msg);

        // Set user data to array
        let arr = [data.msg.admin, data.msg._id, data.msg.phoneno, data.msg.username, data.msg.email];
        setData1(arr);

      } else {
        console.error("Error fetching user data");
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error(error);
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  };

  const storeTokenInLS = (serverToken) => {
    setToken(serverToken);
    localStorage.setItem("token", serverToken);
  };

  const LogoutUser = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  const getServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/Provider/Service`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        console.error("Error fetching services");
        setServices([]);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
    }
  };

  // Run user authentication when the token changes
  useEffect(() => {
    userAuthentication();
  }, [token]);

  // Log updated d1 after it's set
  useEffect(() => {
    if (d1) {
      console.log("Updated d1:", d1);  // This will log after d1 is updated
    }
  }, [d1]);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!token, storeTokenInLS, LogoutUser, d1, getServices, services }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const authContextValue = useContext(AuthContext);
  if (!authContextValue) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return authContextValue;
};
