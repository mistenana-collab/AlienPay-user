import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { Request } from 'express';
import { initDb, getOrCreateUserWallet, DbProfile, DbWallet } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

export const COOKIE_NAME = 'auth_token';

// Hash password using bcrypt (12 salt rounds, same as cryptofd/lib/auth.ts)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token (7d expiration, same as cryptofd/lib/auth.ts)
export async function generateToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique 8-character referral code (same as cryptofd/lib/auth.ts)
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Extract token from Express request (cookie or Authorization Bearer header)
export function extractTokenFromReq(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

// Get current authenticated user + their unique HD wallet
export async function getCurrentUserFromReq(req: Request): Promise<{
  profile: DbProfile;
  wallet: DbWallet;
} | null> {
  const token = extractTokenFromReq(req);
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  const db = await initDb();
  const profile = db.profiles.find((p) => p.id === verified.userId);
  if (!profile) return null;

  const wallet = await getOrCreateUserWallet(profile.id);
  return { profile, wallet };
}
