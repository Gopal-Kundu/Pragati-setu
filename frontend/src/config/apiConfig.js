/**
 * Centralized API & Backend Configuration
 * Seamlessly supports:
 * 1. Vercel Same-Origin Rewrites (First-Party Cookies on Mobile Chrome & Desktop)
 * 2. Vite Local Dev Proxy
 * 3. Explicit VITE_API_BASE_URL override if provided
 */
const rawApiUrl = import.meta.env.VITE_API_BASE_URL;

// Determine API_BASE_URL:
// - If VITE_API_BASE_URL is explicitly set and starts with 'http', use it
// - If VITE_API_BASE_URL is '/api' or relative, use '/api'
// - In production / browser environments with Vercel rewrites or Vite dev proxy, default to '/api'
export const API_BASE_URL = (() => {
  if (rawApiUrl) {
    return rawApiUrl.replace(/\/+$/, '');
  }
  // Default to relative '/api' for same-origin proxy (works with Vercel rewrites & Vite dev proxy)
  return '/api';
})();

export const BACKEND_URL = (() => {
  if (rawApiUrl && (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://'))) {
    return rawApiUrl.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://pragati-setu-vtnk.vercel.app';
})();

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,

  // Problems & Workflow
  PROBLEMS: `${API_BASE_URL}/problems`,
  PROBLEM_BY_ID: (id) => `${API_BASE_URL}/problems/${id}`,
  PROBLEM_ALLOCATE: (id) => `${API_BASE_URL}/problems/${id}/allocate`,
  PROBLEM_PROPOSAL: (id) => `${API_BASE_URL}/problems/${id}/proposal`,
  PROBLEM_FUND: (id) => `${API_BASE_URL}/problems/${id}/fund`,
  PROBLEM_MILESTONE: (id, mId) => `${API_BASE_URL}/problems/${id}/milestones/${mId}`,
  PROBLEM_VALIDATE: (id) => `${API_BASE_URL}/problems/${id}/validate`,

  // AI Services
  AI_CATEGORIZE: `${API_BASE_URL}/ai/categorize`,
  AI_CHAT: `${API_BASE_URL}/ai/chat`,

  // Analytics & GIS Telemetry
  ANALYTICS: `${API_BASE_URL}/analytics`,

  // Universities & Industry
  UNIVERSITIES: `${API_BASE_URL}/universities`,
  INDUSTRY: `${API_BASE_URL}/industry`,

  // Notifications & Email
  SEND_EMAIL: `${API_BASE_URL}/notifications/send`
};

export default {
  BACKEND_URL,
  API_BASE_URL,
  API_ENDPOINTS
};
