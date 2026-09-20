import { apiFetch } from './client.js';

export function signup(input) {
  return apiFetch('/auth/signup', { method: 'POST', body: input });
}

export function login(input) {
  return apiFetch('/auth/login', { method: 'POST', body: input });
}
