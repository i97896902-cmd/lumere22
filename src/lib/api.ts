// Client-side API helper
const getAuthToken = (): string => {
  const userJson = localStorage.getItem("lumere_user");
  if (!userJson) return "";
  try {
    const user = JSON.parse(userJson);
    return user.id || "";
  } catch {
    return "";
  }
};

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // Resolution order: explicit build-time override, then the origin the app is actually
  // served from (Express serves both the API and the SPA, and the Electron shell loads
  // http://localhost:3000), and finally relative URLs so the browser resolves them itself.
  const envUrl = (import.meta as any).env.VITE_API_URL || (import.meta as any).env.VITE_APP_URL;

  let baseUrl = "";
  if (envUrl) {
    // Strip any trailing slash so `${baseUrl}${endpoint}` never produces a double slash.
    baseUrl = String(envUrl).replace(/\/+$/, "");
  } else if (typeof window !== "undefined" && window.location.origin) {
    baseUrl = window.location.origin;
  }

  const resolvedUrl = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(resolvedUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("lumere_user");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth-unauthorized"));
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `خطأ في الخادم (${response.status})`);
  }

  return response.json() as Promise<T>;
}
