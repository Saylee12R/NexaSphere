import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { studentUsersRepository } from '../repositories/studentUsersRepository.js';

<<<<<<< HEAD
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}
const JWT_SECRET = process.env.JWT_SECRET;
=======
>>>>>>> pr-resolve-1976
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is not set');
    }
    console.warn('WARNING: Using insecure default JWT_SECRET for development. Set JWT_SECRET in production.');
    return 'nexasphere-jwt-dev-secret-change-in-production';
  }
  return secret;
}

const STUDENT_ROLES = {
  student: { scopes: ['profile:read', 'profile:write', 'events:read', 'events:register'] },
  club_lead: {
    scopes: [
      'profile:read',
      'profile:write',
      'events:read',
      'events:register',
      'events:write',
      'team:read',
    ],
  },
  admin: {
    scopes: [
      'profile:read',
      'profile:write',
      'events:read',
      'events:register',
      'events:write',
      'team:read',
      'settings:admin',
    ],
  },
};

function getScopesForRole(role) {
  return STUDENT_ROLES[role]?.scopes || STUDENT_ROLES.student.scopes;
}

export const studentAuthService = {
  async findOrCreateFromOAuth(profile) {
    const user = await studentUsersRepository.upsertFromOAuth({
      provider: profile.provider,
      providerId: profile.id,
      email: profile.emails?.[0]?.value || '',
      fullName: profile.displayName || profile.username || '',
      avatarUrl: profile.photos?.[0]?.value || '',
    });
    return user;
  },

  generateRecoveryCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  hashRecoveryCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  },

  async createRecoveryRequest(email) {
    const code = this.generateRecoveryCode();
    const hashed = this.hashRecoveryCode(code);
    await studentUsersRepository.saveRecoveryCode(email, hashed);
    return { email, code };
  },

  async verifyRecoveryCode(email, enteredCode) {
    const hashed = this.hashRecoveryCode(enteredCode);
    const stored = await studentUsersRepository.getRecoveryCode(email);
    if (!stored) return false;
    if (stored.code_hash !== hashed) return false;
    await studentUsersRepository.markRecoveryCodeUsed(stored.id);
    return true;
  },

  generateToken(user) {
    const payload = {
      sub: user.id,
      provider: user.provider,
      email: user.email,
      name: user.full_name,
      role: user.role,
      scopes: user.scopes?.length ? user.scopes : getScopesForRole(user.role),
    };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, getJwtSecret());
    } catch {
      return null;
    }
  },

  getScopesForRole,
};
