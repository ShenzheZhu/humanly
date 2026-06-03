import { query, queryOne } from '../config/database';
import { User, UserRole, UserWithPassword } from '@humanly/shared';

const USER_SELECT = `
  id,
  email,
  role,
  name,
  first_name as "firstName",
  last_name as "lastName",
  profile_completed as "profileCompleted",
  email_verified as "emailVerified",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
}

export interface UpdateUserProfileData {
  firstName: string;
  lastName: string;
}

function getFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: CreateUserData): Promise<User> {
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const name = getFullName(firstName, lastName);
    const sql = `
      INSERT INTO users (
        email,
        password_hash,
        role,
        name,
        first_name,
        last_name,
        profile_completed,
        email_verification_token,
        email_verification_expires
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
      RETURNING ${USER_SELECT}
    `;
    const user = await queryOne<User>(sql, [
      data.email,
      data.passwordHash,
      data.role || 'user',
      name,
      firstName,
      lastName,
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
      SELECT ${USER_SELECT},
             password_hash as "passwordHash",
             email_verification_token as "emailVerificationToken",
             email_verification_expires as "emailVerificationExpires",
             password_reset_token as "passwordResetToken",
             password_reset_expires as "passwordResetExpires"
      FROM users
      WHERE email = $1
    `;
    return queryOne<UserWithPassword>(sql, [email]);
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT ${USER_SELECT}
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
      SELECT ${USER_SELECT},
             password_hash as "passwordHash",
             email_verification_token as "emailVerificationToken",
             email_verification_expires as "emailVerificationExpires"
      FROM users
      WHERE email_verification_token = $1
        AND email_verification_expires > NOW()
    `;
    return queryOne<UserWithPassword>(sql, [token]);
  }

  /**
   * Find user by password reset token
   */
  static async findByResetToken(token: string): Promise<UserWithPassword | null> {
    const sql = `
      SELECT ${USER_SELECT},
             password_hash as "passwordHash",
             password_reset_token as "passwordResetToken",
             password_reset_expires as "passwordResetExpires"
      FROM users
      WHERE password_reset_token = $1
        AND password_reset_expires > NOW()
    `;
    return queryOne<UserWithPassword>(sql, [token]);
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
   * Update editable user profile fields.
   */
  static async updateProfile(id: string, data: UpdateUserProfileData): Promise<User | null> {
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const name = getFullName(firstName, lastName);
    const sql = `
      UPDATE users
      SET name = $1,
          first_name = $2,
          last_name = $3,
          profile_completed = TRUE
      WHERE id = $4
      RETURNING ${USER_SELECT}
    `;
    return queryOne<User>(sql, [name, firstName, lastName, id]);
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM users WHERE id = $1';
    await query(sql, [id]);
  }
}
