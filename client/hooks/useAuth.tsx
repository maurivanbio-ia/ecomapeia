import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { Usuario } from "@shared/schema";

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (partial: Partial<Usuario>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "@mapeia_user";
const TOKEN_STORAGE_KEY = "@mapeia_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Error checking stored auth:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, senha });
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        return true;
      } else {
        setError(data.message || "Erro ao fazer login");
        return false;
      }
    } catch (e: any) {
      const errorMessage = e.message?.includes("401") 
        ? "Email ou senha incorretos"
        : e.message?.includes("404")
        ? "Usuário não encontrado"
        : "Erro de conexão. Tente novamente.";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, TOKEN_STORAGE_KEY]);
      setUser(null);
    } catch (e) {
      console.error("Error logging out:", e);
    }
  };

  const clearError = () => setError(null);

  const updateUser = async (partial: Partial<Usuario>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    setUser(updated);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        clearError,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
