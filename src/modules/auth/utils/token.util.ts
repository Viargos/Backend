import * as bcrypt from 'bcrypt';

/**
 * Hash a refresh token before storing in database
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Compare a refresh token with its hash
 */
export async function compareRefreshToken(
  token: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
