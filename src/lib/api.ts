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

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const envUrl = (import.meta as any).env.VITE_API_URL || (import.meta as any).env.VITE_APP_URL;
  const productionUrl = "https://ais-pre-4scvmfa4vl2woic4t3y2da-498451977070.europe-west2.run.app";
  
  let baseUrl = productionUrl;
  if (envUrl) {
    baseUrl = envUrl;
  } else if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "") {
      baseUrl = window.location.origin;
    }
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

  return response.json();
}
