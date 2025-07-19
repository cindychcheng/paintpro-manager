import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../models/database';
import { generateToken } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = express.Router();

// For demo purposes, we'll create a simple admin user
// In production, you'd want proper user management
interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
}

// Initialize admin user table
const initializeUsers = async () => {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create default admin user if not exists
  const existingUser = await db.get('SELECT id FROM users WHERE email = ?', ['admin@paintingbusiness.com']);
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['admin@paintingbusiness.com', hashedPassword, 'Admin User', 'admin']
    );
    console.log('🔑 Default admin user created: admin@paintingbusiness.com / admin123');
  }
};

initializeUsers();

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as User;
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken(user.id, user.email);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    },
    message: 'Login successful'
  });
}));

// Change password endpoint
router.post('/change-password', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    throw new AppError('All fields are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as User;
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNewPassword, user.id]);

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// Get current user info
router.get('/me', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  // This would require authentication middleware, but for demo we'll skip
  res.json({
    success: true,
    data: {
      email: 'admin@paintingbusiness.com',
      name: 'Admin User',
      role: 'admin'
    }
  });
}));

export default router;