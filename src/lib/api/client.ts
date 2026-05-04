// API client for connecting to eduai-api Laravel backend.
//
// All requests go through the same-origin /api/backend proxy, which injects the
// httpOnly Sanctum token server-side. This means: no token in client JS, no
// CORS, no NEXT_PUBLIC_* secrets.

const PROXY_BASE = "/api/backend";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface LaravelResponse<T> {
  data: T;
  meta?: {
    total?: number;
  };
  message?: string;
}

interface LaravelErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);
  return `${PROXY_BASE}/${endpoint}`;
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    if (!response.ok) {
      throw new ApiError("Server error", response.status);
    }
    return {} as T;
  }

  const json = await response.json();

  if (!response.ok) {
    const errorResponse = json as LaravelErrorResponse;
    throw new ApiError(
      errorResponse.message || "An error occurred",
      response.status,
      errorResponse.errors
    );
  }

  // Laravel wraps responses in { data: ... }
  const laravelResponse = json as LaravelResponse<T>;
  return laravelResponse.data;
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: "GET",
      headers: jsonHeaders(),
      credentials: "same-origin",
    });
    return handleResponse<T>(response);
  },

  /** Returns the full Laravel response (including meta, etc.) without unwrapping `data`. */
  async getFullResponse<T>(endpoint: string): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: "GET",
      headers: jsonHeaders(),
      credentials: "same-origin",
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new ApiError(
        (json as LaravelErrorResponse).message || "An error occurred",
        response.status,
        (json as LaravelErrorResponse).errors,
      );
    }
    return response.json() as Promise<T>;
  },

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: "DELETE",
      headers: jsonHeaders(),
      credentials: "same-origin",
    });
    return handleResponse<T>(response);
  },

  // Upload FormData (multipart) — does NOT set Content-Type so browser can set boundary.
  async uploadFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(buildUrl(endpoint), {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
      credentials: "same-origin",
    });
    return handleResponse<T>(response);
  },

  // Special method for uploading course JSON.
  async uploadCourse<T>(courseData: unknown): Promise<T> {
    const response = await fetch(buildUrl("courses/upload"), {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(courseData),
      credentials: "same-origin",
    });
    return handleResponse<T>(response);
  },

  /** Fetch a binary asset (e.g. CSV export) through the proxy, returning the Response so callers can stream. */
  async getRaw(endpoint: string, accept = "application/octet-stream"): Promise<Response> {
    return fetch(buildUrl(endpoint), {
      method: "GET",
      headers: { Accept: accept },
      credentials: "same-origin",
    });
  },
};
