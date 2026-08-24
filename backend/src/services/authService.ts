import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserSession } from '../types';
import { LogService } from './logService';

interface UserRecord {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'user';
  email: string;
}

export class AuthService {
  private static getUsersFilePath(): string {
    return path.join(ENV.CONFIG_DIR, 'users.json');
  }

  private static loadUsers(): UserRecord[] {
    const filePath = this.getUsersFilePath();
    if (!fs.existsSync(filePath)) {
      const defaultUsers: UserRecord[] = [
        { id: 'usr_01', username: 'admin', password: 'Admin2026', fullName: 'Audit Lead', role: 'admin', email: 'admin@deloitte.com' },
        { id: 'usr_02', username: 'user', password: 'User2026', fullName: 'JET Practitioner', role: 'user', email: 'user@deloitte.com' },
      ];
      fs.writeFileSync(filePath, JSON.stringify(defaultUsers, null, 2), 'utf-8');
      return defaultUsers;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      LogService.log('ERROR', 'AUTH', `Failed to read users config: ${err}`);
      return [];
    }
  }

  public static login(username: string, password: string): { token: string; user: UserSession } | null {
    const users = this.loadUsers();
    const cleanUser = username.trim().toLowerCase();
    const user = users.find((u) => u.username.toLowerCase() === cleanUser);

    if (!user || user.password !== password) {
      LogService.log('WARN', 'AUTH', `Failed login attempt for username: ${username}`);
      return null;
    }

    const sessionUser: UserSession = {
      id: user.id || 'usr_' + user.username,
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role || 'user',
      email: user.email || `${user.username}@deloitte.com`,
    };

    const token = jwt.sign(sessionUser, ENV.JWT_SECRET, { expiresIn: '7d' });
    LogService.log('INFO', 'AUTH', `User logged in successfully: ${user.username}`);
    return { token, user: sessionUser };
  }

  public static verifyToken(token: string): UserSession | null {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as UserSession;
      return decoded;
    } catch (err) {
      return null;
    }
  }
}
