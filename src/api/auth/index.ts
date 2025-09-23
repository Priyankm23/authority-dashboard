/*
  Auth API client
  - Separate base URL for auth-related endpoints (do not mix with other API endpoints)
  - Default base: http://localhost:8000/api/auth
  - Exports: signup, login
*/

const DEFAULT_AUTH_BASE = 'http://localhost:5000/api/auth';
const AUTH_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || DEFAULT_AUTH_BASE;

export type SignupPayload = {
  username: string;
  email: string;
  password: string;
  fullName: string;
  policeStationId: string;
  role: 'Police Officer' | 'Tourism Officer' | 'Emergency Responder' | 'Admin';
};

export type AuthResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: any;
  error?: string;
};

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // backend may return { error: '...' }
    return { success: false, message: data?.message || data?.error || `Signup failed: ${res.status}`, error: data?.error };
  }
  return { success: true, ...data } as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: data?.message || data?.error || `Login failed: ${res.status}`, error: data?.error };
  }
  return { success: true, ...data } as AuthResponse;
}

export default { signup, login };
