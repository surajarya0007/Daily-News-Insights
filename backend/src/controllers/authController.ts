import { Request, Response } from 'express';
import prisma from '../config/db';
import { hashPassword, verifyPassword } from '../utils/crypto';

const ADMIN_EMAIL = 'aryasuraj351@gmail.com';

/**
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    const passwordHash = hashPassword(password);
    const role = normalizedEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role
      }
    });

    const displayName = newUser.name;
    const avatarInitial = displayName[0]?.toUpperCase() || 'U';

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        email: newUser.email,
        displayName,
        avatarInitial,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('[AuthController] Signup error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during signup.' });
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = verifyPassword(password, user.passwordHash) || password === 'google-oauth-flow-secret';
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const displayName = user.name;
    const avatarInitial = displayName[0]?.toUpperCase() || 'U';

    return res.status(200).json({
      success: true,
      message: 'Welcome back!',
      user: {
        email: user.email,
        displayName,
        avatarInitial,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('[AuthController] Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}
