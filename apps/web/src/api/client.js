const TOKEN_STORAGE_KEY = 'sajilo_token';

// Empty in dev - Vite's proxy forwards /api to the local backend (see
// vite.config.js). Set to the deployed API's origin (no trailing slash)
// via VITE_API_URL in production, since frontend and backend are on
// different domains there (Vercel + Render).
const API_BASE = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiClientError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Thin fetch wrapper: attaches the auth token, unwraps JSON, and normalizes
// errors into ApiClientError so screens can show err.message directly.
export async function apiFetch(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiClientError(data.error || 'Something went wrong', response.status, data.details);
  }

  return data;
}
