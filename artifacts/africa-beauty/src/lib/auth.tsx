import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, setAuthTokenGetter, User, UserRole } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  role: "MANAGER" | "EMPLOYEE" | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("africa_beauty_token"));

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("africa_beauty_token"));
  }, []);

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  const handleLogin = (newToken: string) => {
    localStorage.setItem("africa_beauty_token", newToken);
    setToken(newToken);
    refetch();
  };

  const handleLogout = () => {
    localStorage.removeItem("africa_beauty_token");
    setToken(null);
  };

  let role: "MANAGER" | "EMPLOYEE" | null = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      role = payload.role as "MANAGER" | "EMPLOYEE";
    } catch (e) {
      // invalid token
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        role: role || (user?.role as "MANAGER" | "EMPLOYEE") || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
