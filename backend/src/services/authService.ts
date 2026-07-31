import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import type { AuthUser, User } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';

export function login(
  username: string,
  password: string
): { accessToken: string; user: { username: string; role: string } } {
  if (!username || !password) {
    throw new AppError(400, 'CREDENTIALS_REQUIRED', 'Username and password are required');
  }

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as User | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    role: user.role,
  };

  return {
    accessToken: signToken(authUser),
    user: {
      username: user.username,
      role: user.role,
    },
  };
}
