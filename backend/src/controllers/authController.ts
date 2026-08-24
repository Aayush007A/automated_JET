import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    const authResult = AuthService.login(username, password);
    if (!authResult) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Please verify username and password.' });
      return;
    }

    res.json({
      success: true,
      message: 'Login successful',
      token: authResult.token,
      user: authResult.user,
    });
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Logged out successfully' });
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    res.json({ success: true, user: req.user });
  }
}
