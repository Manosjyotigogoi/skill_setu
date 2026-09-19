// Thin fetch wrapper around the Skill-Setu backend.
//
// Conventions:
//   * Base URL comes from VITE_API_URL (set in .env). Defaults to '/api' which
//     Vite proxies to the backend in dev (see vite.config.js).
//   * Auth uses httpOnly cookies. Every request sends `credentials: 'include'`
//     so the browser attaches the `skillsetu_token` cookie automatically.
//   * The backend does NOT use a uniform `{ success, data, message }` envelope.
//     Each controller returns its own top-level shape, so `api.get('/skills')`
//     resolves to the parsed JSON body verbatim (e.g. `{ skills: [...] }`).
//   * On non-2xx responses the backend returns `{ message }`. We throw an
//     ApiError carrying that message + status, so callers can `try/catch`.
//
// Usage:
//   import { api, ApiError } from '@/lib/api';
//   const { skills } = await api.get('/skills');
//   const { user } = await api.post('/auth/login', { identifier, password });

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(method, path, { body, formData, signal } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {};
  let payload;

  if (formData instanceof FormData) {
    // Do NOT set Content-Type for FormData — the browser must set the
    // multipart boundary itself.
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include', // send + accept httpOnly cookie
      body: payload,
      signal
    });
  } catch (err) {
    // Network error, CORS, server down — surface a clean ApiError.
    throw new ApiError(
      err.name === 'AbortError'
        ? 'Request was cancelled.'
        : 'Cannot reach Skill-Setu servers. Please check your connection and try again.',
      0,
      { cause: String(err) }
    );
  }

  // 204 No Content
  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data.message) ||
      defaultMessageFor(res.status);
    throw new ApiError(message, res.status, data);
  }

  return data;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function defaultMessageFor(status) {
  switch (status) {
    case 400: return 'Bad request — please check the data you submitted.';
    case 401: return 'You need to sign in again.';
    case 403: return 'You do not have permission to do that.';
    case 404: return 'That resource was not found.';
    case 409: return 'That resource already exists.';
    case 429: return 'Too many attempts. Please slow down.';
    case 500: return 'Something went wrong on our servers. Please retry shortly.';
    default: return `Request failed (${status}).`;
  }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
  upload: (path, formData, opts) => request('POST', path, { ...opts, formData })
};

// Convenience helper for file downloads (e.g. fetching an uploaded document).
// Returns a Blob; caller is responsible for triggering a save.
export async function downloadBlob(path) {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || defaultMessageFor(res.status), res.status, data);
  }
  return res.blob();
}
