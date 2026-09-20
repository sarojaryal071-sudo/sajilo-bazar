import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../middleware/error.middleware.js';
import * as authModel from './auth.model.js';

const SALT_ROUNDS = 10;

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function signup({ fullName, phone, email, password, role }) {
  const existing = await authModel.findByPhone(phone);
  if (existing) throw new ApiError(409, 'An account with this phone number already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authModel.createUser({ fullName, phone, email, passwordHash, role });
  return { token: issueToken(user), user };
}

export async function login({ phone, password }) {
  const user = await authModel.findByPhoneWithPassword(phone);
  if (!user) throw new ApiError(401, 'Invalid phone number or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid phone number or password');

  if (user.moderationStatus === 'suspended') {
    throw new ApiError(403, 'This account has been suspended');
  }

  const { passwordHash, ...safeUser } = user;
  return { token: issueToken(safeUser), user: safeUser };
}
