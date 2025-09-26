import type { User } from '../../types';

// Fetch the current authenticated user using the session cookie
export async function getCurrentUser(): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/me`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: data?.message || data?.error || `Auth check failed: ${res.status}`, error: data?.error };
    }

    // backend returns { success: true, user: { id, username, fullName, email, role, authorityId, isActive } }
    // map it to frontend User shape used in the app
    const backendUser = data?.user;
    const mappedUser: User | undefined = backendUser
      ? {
          id: String(backendUser.id || backendUser._id || ''),
          // frontend expects `name` while backend provides `fullName` or `username`
          name: backendUser.fullName || backendUser.username || '',
          email: backendUser.email || '',
          // map roles conservatively: backend uses human-friendly roles
          role:
            (backendUser.role && typeof backendUser.role === 'string'
              ? backendUser.role.toLowerCase().includes('police')
                ? 'police'
                : backendUser.role.toLowerCase().includes('tourism')
                ? 'tourism'
                : 'admin'
              : 'admin') as User['role'],
          // authorityId/department mapping: prefer authorityId, fallback to empty string
          department: backendUser.authorityId || backendUser.department || '',
        }
      : undefined;

    return { success: true, user: mappedUser } as AuthResponse;
}
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
  authorityId: string;
  role: 'Police Officer' | 'Tourism Officer' | 'Emergency Responder' | 'System Administrator';
};

export type AuthResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: User | undefined;
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
    credentials: 'include', // This is required for cookies to be sent and received
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: data?.message || data?.error || `Login failed: ${res.status}`, error: data?.error };
  }
  return { success: true, ...data } as AuthResponse;
}
