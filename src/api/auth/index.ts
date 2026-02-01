import type { User } from "../../types";

// Fetch the current authenticated user using the session cookie
export async function getCurrentUser(): Promise<AuthResponse> {
  // add a timeout so requests that hang don't block the app indefinitely
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `${AUTH_BASE}/api/authority/me`;
    console.debug("getCurrentUser: fetching", url);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("getCurrentUser: server responded not ok", res.status, data);
      return {
        success: false,
        message:
          data?.message || data?.error || `Auth check failed: ${res.status}`,
        error: data?.error,
      };
    }
    // success path continues below
    clearTimeout(timeout);

    // backend returns { success: true, user: { id, username, fullName, email, role, authorityId, isActive } }
    // map it to frontend User shape used in the app
    const backendUser = data?.user;
    const mappedUser: User | undefined = backendUser
      ? {
          id: String(backendUser.id || backendUser._id || ""),
          // frontend expects `name` while backend provides `fullName` or `username`
          name: backendUser.fullName || backendUser.username || "",
          email: backendUser.email || "",
          // map roles conservatively: backend uses human-friendly roles
          role: (backendUser.role && typeof backendUser.role === "string"
            ? backendUser.role.toLowerCase().includes("police")
              ? "police"
              : backendUser.role.toLowerCase().includes("tourism")
                ? "tourism"
                : "admin"
            : "admin") as User["role"],
          // authorityId/department mapping: prefer authorityId, fallback to empty string
          department: backendUser.authorityId || backendUser.department || "",
        }
      : undefined;

    return { success: true, user: mappedUser } as AuthResponse;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("getCurrentUser: request timed out");
      return { success: false, message: "Auth request timed out" };
    }
    console.error("getCurrentUser: fetch error", err);
    return { success: false, message: err?.message || "Network error" };
  } finally {
    clearTimeout(timeout);
  }
}
/*
  Auth API client
  - Separate base URL for auth-related endpoints (do not mix with other API endpoints)
  - Default base: http://localhost:8000/api/auth
  - Exports: signup, login
*/

import { API_BASE_URL } from "../../config";
const AUTH_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || API_BASE_URL;

export type SignupPayload = {
  username: string;
  email: string;
  password: string;
  fullName: string;
  authorityId: string;
  role:
    | "Police Officer"
    | "Tourism Officer"
    | "Emergency Responder"
    | "System Administrator";
};

export type AuthResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: User | undefined;
  error?: string;
};

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/api/authority/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // backend may return { error: '...' }
    return {
      success: false,
      message: data?.message || data?.error || `Signup failed: ${res.status}`,
      error: data?.error,
    };
  }
  return { success: true, ...data } as AuthResponse;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/api/authority/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: data?.message || data?.error || `Login failed: ${res.status}`,
      error: data?.error,
    };
  }
  return { success: true, ...data } as AuthResponse;
}
