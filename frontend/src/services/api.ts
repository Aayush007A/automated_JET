const API_BASE = '/api';

export class ApiError extends Error {
  public code?: string;
  public details?: any;
  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const getToken = (): string | null => {
  return localStorage.getItem('jet_auth_token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('jet_auth_token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('jet_auth_token');
  localStorage.removeItem('jet_user');
};

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || `API Error: ${response.statusText}`,
      data.code || 'API_ERROR',
      data.details
    );
  }

  return data;
}
