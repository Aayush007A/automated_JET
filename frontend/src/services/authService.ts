import { fetchApi, setToken, removeToken } from './api';
import { UserSession } from '../types';

export class AuthService {
  public static async login(username: string, password: string): Promise<{ token: string; user: UserSession }> {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.token && data.user) {
      setToken(data.token);
      localStorage.setItem('jet_user', JSON.stringify(data.user));
    }

    return data;
  }

  public static async logout(): Promise<void> {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      removeToken();
    }
  }

  public static getCurrentUser(): UserSession | null {
    const stored = localStorage.getItem('jet_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  public static async fetchMe(): Promise<UserSession | null> {
    try {
      const data = await fetchApi('/auth/me');
      if (data.user) {
        localStorage.setItem('jet_user', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  }
}
