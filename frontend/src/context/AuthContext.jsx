import { useCallback, useEffect, useState } from "react";
import { identifyUser, resetPosthog } from "../lib/posthog";
import { applyUserTheme } from "../utils/themePreference";
import {
  isNativeAndroid,
  refreshNativeSession,
  restoreNativeSession,
  revokeNativeSession,
  setNativeAccessToken,
  setNativeSession
} from "../services/nativeAuthSession";
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
  const nativeAndroid = isNativeAndroid();
  const [{ token, user }, setAuth] = useState(
    nativeAndroid ? { token: null, user: null } : readStoredAuth
  );
  const [loading, setLoading] = useState(nativeAndroid);
  const [sessionNotice, setSessionNotice] = useState("");

  const restoreSession = useCallback(async () => {
    if (!nativeAndroid) return;

    try {
      const restored = await restoreNativeSession();
      setAuth({ token: restored?.token || null, user: restored?.user || null });
      setSessionNotice(restored?.notice || "");
    } catch (error) {
      console.warn(
        "Unable to restore the saved Android session:",
        error.response?.status || error.message
      );
      setAuth({ token: null, user: null });
      setSessionNotice(
        "Your saved sign-in could not be checked. Connect to the internet and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [nativeAndroid]);

  const retrySessionRestore = useCallback(() => {
    setLoading(true);
    return restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (user) identifyUser(user);
    applyUserTheme(user);
  }, [user]);

  useEffect(() => {
    if (!nativeAndroid) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) restoreSession();
    });
    const handleExpiredSession = () => {
      setNativeAccessToken(null);
      setAuth({ token: null, user: null });
      setSessionNotice("Your saved sign-in has expired. Please sign in again.");
      resetPosthog();
    };
    window.addEventListener("skillbridge:native-session-expired", handleExpiredSession);
    return () => {
      active = false;
      window.removeEventListener("skillbridge:native-session-expired", handleExpiredSession);
    };
  }, [nativeAndroid, restoreSession]);

  useEffect(() => {
    if (!nativeAndroid || !user) return undefined;

    const refreshIfActive = () => {
      if (document.visibilityState !== "visible") return;
      refreshNativeSession().catch((error) => {
        console.warn(
          "Unable to refresh the Android session:",
          error.response?.status || error.message
        );
      });
    };
    const intervalId = window.setInterval(refreshIfActive, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshIfActive);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfActive);
    };
  }, [nativeAndroid, user]);

  const login = async (userData, userToken, refreshToken) => {
    if (nativeAndroid) {
      try {
        await restoreNativeSession();
      } catch (error) {
        console.warn(
          "Unable to finish Android session restoration before sign-in:",
          error.response?.status || error.message
        );
      }
      await setNativeSession({ token: userToken, refreshToken });
      setSessionNotice("");
    } else {
      sessionStorage.setItem("token", userToken);
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    setAuth({ user: userData, token: userToken });
    identifyUser(userData);
  };

  const logout = async () => {
    let result = { serverRevoked: true };
    if (nativeAndroid) {
      try {
        result = await revokeNativeSession();
      } catch (error) {
        console.error(
          "Unable to finish secure Android sign-out:",
          error.response?.status || error.message
        );
        result = { serverRevoked: false };
      }
    } else {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    if (nativeAndroid) setNativeAccessToken(null);
    setAuth({ user: null, token: null });
    setSessionNotice("");
    resetPosthog();
    return result;
  };

  const updateUser = (partialUserData) => {
    setAuth((current) => {
      const nextUser = {
        ...(current.user || {}),
        ...(partialUserData || {}),
      };
      if (!nativeAndroid) {
        sessionStorage.setItem("user", JSON.stringify(nextUser));
      }
      return { ...current, user: nextUser };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        loading,
        sessionNotice,
        retrySessionRestore
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
