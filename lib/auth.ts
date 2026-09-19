import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './db';
import { User, Role } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'safe-solutions-secret-token-key-2026-secure-orders';
const COOKIE_NAME = 'safe_auth_token';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  designation: string;
}

export function signToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    designation: user.designation,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await db.getUserById(payload.userId);
    if (!user || !user.active) return null;

    return user;
  } catch {
    return null;
  }
}

export function isFullAccess(role: Role): boolean {
  return ['BOSS', 'CONTROLLER', 'MANAGER'].includes(role);
}

export function canManageProducts(role: Role): boolean {
  return isFullAccess(role);
}

export function canReviewRates(role: Role): boolean {
  return isFullAccess(role);
}

export function canManageSettings(role: Role): boolean {
  return isFullAccess(role);
}

export function canViewAuditLogs(role: Role): boolean {
  return isFullAccess(role);
}

export function canAccessTeam(role: Role): boolean {
  return isFullAccess(role);
}

export function canAccessReports(role: Role): boolean {
  return isFullAccess(role);
}

export function canCreateOrders(role: Role): boolean {
  return ['BOSS', 'CONTROLLER', 'MANAGER', 'AREA_SALES_MANAGER', 'MARKETING_EXECUTIVE', 'SALES_PERSON'].includes(role);
}

export { COOKIE_NAME };
