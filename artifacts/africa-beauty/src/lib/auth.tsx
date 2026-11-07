import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface User { id: number; name: string; email: string; role: "MANAGER" | "EMPLOYEE"; salonId: number; }
interface AuthContextType {
  user: User | null;
  token: string | null;
  role: "MANAGER" | "EMPLOYEE" | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Envoie le jeton avec toutes les requêtes des hooks générés
setAuthTokenGetter(() => localStorage.getItem("africa_beauty_token"));

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("africa_beauty_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem("africa_beauty_token");
      if (!storedToken) { setIsLoading(false); return; }
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${storedToken}` } });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? data);
          setToken(storedToken);
        } else {
          localStorage.removeItem("africa_beauty_token");
          setToken(null); setUser(null);
        }
      } catch (e) { console.error("Erreur auth", e); } finally { setIsLoading(false); }
    }
    checkAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("africa_beauty_token", newToken);
    setToken(newToken); setUser(newUser);
    setLocation(newUser.role === "MANAGER" ? "/dashboard" : "/my-schedule");
  };

  const logout = () => {
    localStorage.removeItem("africa_beauty_token");
    setToken(null); setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, role: user?.role ?? null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
