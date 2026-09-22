import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, RoleName } from "../types";
import { authApi, apiClient } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  hasRole: (roles: RoleName | RoleName[]) => boolean;
  isAdmin: boolean;
  isHR: boolean;
  isRecruiter: boolean;
  isCandidate: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("skillalign_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (): Promise<User | null> => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error("Failed to fetch current user:", err);
      localStorage.removeItem("skillalign_token");
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (newToken: string): Promise<User> => {
    // CRITICAL: Set token synchronously in localStorage BEFORE any API call
    // so that the request interceptor picks up the Bearer token correctly.
    localStorage.setItem("skillalign_token", newToken);
    // Also update axios default header immediately for the pending getMe call
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    const userData = await authApi.getMe();
    setUser(userData);
    return userData;
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem("skillalign_token");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  const refreshUser = async (): Promise<User | null> => {
    return await fetchCurrentUser();
  };

  const hasRole = (roles: RoleName | RoleName[]): boolean => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role.name);
  };

  const roleName = user?.role.name;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
        isAdmin: roleName === "Admin",
        isHR: roleName === "HR",
        isRecruiter: roleName === "Recruiter",
        isCandidate: roleName === "Candidate",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
