import { useEffect, useState } from "react";
import { identifyUser, resetPosthog } from "../lib/posthog";
import { AuthContext } from "./AuthContextValue";

const readStoredAuth = () => {
  let storedToken = sessionStorage.getItem("token");
  let storedUser = sessionStorage.getItem("user");

  if (!storedToken || !storedUser) {
    storedToken = localStorage.getItem("token");
    storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      sessionStorage.setItem("token", storedToken);
      sessionStorage.setItem("user", storedUser);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  if (!storedToken || !storedUser) {
    return { token: null, user: null };
  }

  try {
    return { token: storedToken, user: JSON.parse(storedUser) };
  } catch {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [{ token, user }, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    if (user) identifyUser(user);
  }, [user]);

  const login = (userData, userToken) => {
    setAuth({ user: userData, token: userToken });
    sessionStorage.setItem("token", userToken);
    sessionStorage.setItem("user", JSON.stringify(userData));
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    identifyUser(userData);
  };

  const logout = () => {
    setAuth({ user: null, token: null });
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    resetPosthog();
  };

  const updateUser = (partialUserData) => {
    setAuth((current) => {
      const nextUser = {
        ...(current.user || {}),
        ...(partialUserData || {}),
      };
      sessionStorage.setItem("user", JSON.stringify(nextUser));
      return { ...current, user: nextUser };
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser, loading: false }}
    >
      {children}
    </AuthContext.Provider>
  );
};
