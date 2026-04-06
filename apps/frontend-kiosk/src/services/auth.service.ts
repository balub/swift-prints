// Auth Service - Authentication operations

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryKeys } from "./api-client";

// ============ Types ============

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  username: string;
}

export interface AuthUser {
  username: string;
  role: string;
}

// ============ Token Storage ============

const TOKEN_KEY = "swift_prints_admin_token";
const USER_KEY = "swift_prints_admin_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setStoredAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

// ============ API Functions ============

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
  
  // Store the token and user info
  setStoredAuth(response.accessToken, {
    username: response.username,
    role: "admin",
  });
  
  return response;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  
  return apiRequest<AuthUser>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function logout(): void {
  clearStoredAuth();
}

// ============ React Query Hooks ============

/**
 * Hook to perform login
 */
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.health });
    },
  });
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to perform logout
 */
export function useLogout() {
  const queryClient = useQueryClient();
  
  return () => {
    logout();
    queryClient.clear();
    window.location.href = "/admin/login";
  };
}

