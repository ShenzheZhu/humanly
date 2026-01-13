import { query, queryOne } from '../config/database';

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshTokenModel {
  /**
   * Create a new refresh token
   */
  static async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token_hash, expires_at, created_at
    `;
    const result = await queryOne<any>(sql, [userId, tokenHash, expiresAt]);
    if (!result) throw new Error('Failed to create refresh token');

    return {
      id: result.id,
      userId: result.user_id,
      tokenHash: result.token_hash,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
    };
  }

  /**
   * Find refresh token by user ID and token hash
   */
  static async findByUserIdAndHash(
    userId: string,
    tokenHash: string
  ): Promise<RefreshToken | null> {
    const sql = `
      SELECT id, user_id, token_hash, expires_at, created_at
      FROM refresh_tokens
      WHERE user_id = $1
        AND token_hash = $2
        AND expires_at > NOW()
    `;
    const result = await queryOne<any>(sql, [userId, tokenHash]);
    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      tokenHash: result.token_hash,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
    };
  }

  /**
   * Find refresh token by token hash
   */
  static async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const sql = `
      SELECT id, user_id, token_hash, expires_at, created_at
      FROM refresh_tokens
      WHERE token_hash = $1
        AND expires_at > NOW()
    `;
    const result = await queryOne<any>(sql, [tokenHash]);
    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      tokenHash: result.token_hash,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
    };
  }

  /**
   * Delete all refresh tokens for a user (logout all devices)
   */
  static async deleteByUserId(userId: string): Promise<void> {
    const sql = 'DELETE FROM refresh_tokens WHERE user_id = $1';
    await query(sql, [userId]);
  }

  /**
   * Delete a specific refresh token
   */
  static async deleteByHash(tokenHash: string): Promise<void> {
    const sql = 'DELETE FROM refresh_tokens WHERE token_hash = $1';
    await query(sql, [tokenHash]);
  }

  /**
   * Delete expired refresh tokens (cleanup)
   */
  static async deleteExpired(): Promise<void> {
    const sql = 'DELETE FROM refresh_tokens WHERE expires_at <= NOW()';
    await query(sql, []);
  }

  /**
   * Count refresh tokens for a user
   */
  static async countByUserId(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM refresh_tokens
      WHERE user_id = $1
        AND expires_at > NOW()
    `;
    const result = await queryOne<{ count: string }>(sql, [userId]);
    return result ? parseInt(result.count, 10) : 0;
  }
}
