import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("auth_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  // Try to restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth_user");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
        setToken(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Login failed");
    }
    const data = await res.json();
    const userData = { email, ...data.user };
    setToken(data.token);
    setUser(userData);
    localStorage.setItem("auth_user", JSON.stringify(userData));
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await fetch(getApiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Registration failed");
    }
    const data = await res.json();
    const userData = { name, email, ...data.user };
    setToken(data.token);
    setUser(userData);
    localStorage.setItem("auth_user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}