import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

const ADMIN_EMAIL = 'aryasuraj351@gmail.com';

/**
 * Middleware to restrict endpoints to administrators.
 * Verifies that the X-Admin-Email header matches the admin email,
 * exists in the database, and is flagged as an 'admin' role.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminEmail = req.headers['x-admin-email'] as string;

  if (!adminEmail) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin email header missing.' });
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin user account does not exist in the database.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. This account does not have administrator privileges.' });
    }

    (req as any).user = user;
    next();
  } catch (error: any) {
    console.error('[AuthMiddleware] Verification error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error verifying credentials.' });
  }
}
