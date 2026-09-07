let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const defaultHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Crucial for HttpOnly cookies!
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response = await fetch(url, config);

  // If 401 Unauthorized and not already refreshing, trigger silent token refresh
  if (response.status === 401 && !endpoint.includes('/refresh') && !endpoint.includes('/signin') && !endpoint.includes('/signup')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiFetch<T>(endpoint, options));
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch('/api/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        isRefreshing = false;
        processQueue(null);
        // Retry original request with newly refreshed cookie
        response = await fetch(url, config);
      } else {
        isRefreshing = false;
        processQueue(new Error('Refresh failed'));
        // Trigger event so AuthContext knows session is dead
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new Error('Session expired. Please sign in again.');
      }
    } catch (err: any) {
      isRefreshing = false;
      processQueue(err);
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw err;
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};
