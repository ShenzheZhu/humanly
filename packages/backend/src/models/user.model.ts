import { query, queryOne } from '../config/database';
import { User, UserWithPassword } from '@humory/shared';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
}

export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: CreateUserData): Promise<User> {
    const sql = `
      INSERT INTO users (email, password_hash, email_verification_token, email_verification_expires)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, email_verified, created_at, updated_at
    `;
    const user = await queryOne<User>(sql, [
      data.email,
      data.passwordHash,
      data.emailVerificationToken,
      data.emailVerificationExpires,
    ]);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<UserWithPassword | null> {
    const sql = `
      SELECT id, email, password_hash, email_verified,
             email_verification_token, email_verification_expires,
             password_reset_token, password_reset_expires,
             created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    const user = await queryOne<any>(sql, [email]);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      emailVerificationExpires: user.email_verification_expires,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT id, email, email_verified, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    return queryOne<User>(sql, [id]);
  }

  /**
   * Find user by verification token
   */
  static async findByVerificationToken(token: string): Promise<UserWithPassword | null> {
    const sql = `
      SELECT id, email, password_hash, email_verified,
             email_verification_token, email_verification_expires,
             created_at, updated_at
      FROM users
      WHERE email_verification_token = $1
        AND email_verification_expires > NOW()
    `;
    const user = await queryOne<any>(sql, [token]);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      emailVerified: user.email_verified,
      emailVerificationToken: user.email_verification_token,
      emailVerificationExpires: user.email_verification_expires,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Find user by password reset token
   */
  static async findByResetToken(token: string): Promise<UserWithPassword | null> {
    const sql = `
      SELECT id, email, password_hash, email_verified,
             password_reset_token, password_reset_expires,
             created_at, updated_at
      FROM users
      WHERE password_reset_token = $1
        AND password_reset_expires > NOW()
    `;
    const user = await queryOne<any>(sql, [token]);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      emailVerified: user.email_verified,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Verify user email
   */
  static async verifyEmail(id: string): Promise<void> {
    const sql = `
      UPDATE users
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE id = $1
    `;
    await query(sql, [id]);
  }

  /**
   * Set password reset token
   */
  static async setPasswordResetToken(
    id: string,
    token: string,
    expires: Date
  ): Promise<void> {
    const sql = `
      UPDATE users
      SET password_reset_token = $1,
          password_reset_expires = $2
      WHERE id = $3
    `;
    await query(sql, [token, expires, id]);
  }

  /**
   * Reset password
   */
  static async resetPassword(id: string, passwordHash: string): Promise<void> {
    const sql = `
      UPDATE users
      SET password_hash = $1,
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = $2
    `;
    await query(sql, [passwordHash, id]);
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    const sql = `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
    `;
    await query(sql, [passwordHash, id]);
  }

  /**
   * Update verification token (for resending verification email)
   */
  static async updateVerificationToken(
    id: string,
    token: string,
    expires: Date
  ): Promise<void> {
    const sql = `
      UPDATE users
      SET email_verification_token = $1,
          email_verification_expires = $2
      WHERE id = $3
    `;
    await query(sql, [token, expires, id]);
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM users WHERE id = $1';
    await query(sql, [id]);
  }
}
