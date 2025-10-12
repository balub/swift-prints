/**
 * Authentication Context Provider
 * Manages user authentication state and provides auth methods
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/api-client";
import { User as ApiUser, UserRole } from "@/types/api";

interface AuthContextType {
  // State
  user: ApiUser | null;
  session: Session | null;
  loading: boolean;

  // Methods
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;

  // Utility methods
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        handleSessionChange(session);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session) {
        await handleSessionChange(session);
      } else {
        setUser(null);
        apiClient.setAuthToken(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionChange = async (session: Session) => {
    try {
      // Set token in API client
      apiClient.setAuthToken(session.access_token);

      // Verify token with backend and get user info
      const response = await apiClient.post("/auth/verify", {
        token: session.access_token,
      });

      if (response.data) {
        const apiUser: ApiUser = {
          id: response.data.user_id,
          email: response.data.email,
          role: response.data.role as UserRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(apiUser);
      }
    } catch (error) {
      console.error("Error verifying token with backend:", error);
      // If backend verification fails, still set basic user info from Supabase
      if (session.user) {
        const fallbackUser: ApiUser = {
          id: session.user.id,
          email: session.user.email || "",
          role: UserRole.CUSTOMER, // Default role
          created_at: session.user.created_at || new Date().toISOString(),
          updated_at: session.user.updated_at || new Date().toISOString(),
        };
        setUser(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const isAuthenticated = !!user && !!session;

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
