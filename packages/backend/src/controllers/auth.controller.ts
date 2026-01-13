import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware/error-handler';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@humory/shared';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { email, password } = registerSchema.parse(req.body);

  // Register user
  const user = await AuthService.register(email, password);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: { user },
  });
});

/**
 * Verify email address
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { code } = verifyEmailSchema.parse(req.body);

  // Verify email
  const user = await AuthService.verifyEmail(code);

  res.json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
    data: { user },
  });
});

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body - expect email
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Email is required',
    });
    return;
  }

  // Resend verification email
  await AuthService.resendVerificationEmail(email);

  res.json({
    success: true,
    message: 'If your email is registered and not verified, a new verification email has been sent.',
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { email, password } = loginSchema.parse(req.body);

  // Login user
  const { user, accessToken, refreshToken } = await AuthService.login(email, password);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Optionally set access token as cookie too
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      accessToken,
    },
  });
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Get refresh token from cookie or body
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  // Logout user
  await AuthService.logout(userId, refreshToken);

  // Clear cookies
  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');

  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Get refresh token from cookie or body
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Refresh token required',
    });
    return;
  }

  // Refresh tokens
  const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(
    refreshToken
  );

  // Set new refresh token as httpOnly cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Set new access token as cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken,
    },
  });
});

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { email } = forgotPasswordSchema.parse(req.body);

  // Request password reset
  await AuthService.forgotPassword(email);

  // Always return success to prevent email enumeration
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * Reset password
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { token, newPassword } = resetPasswordSchema.parse(req.body);

  // Reset password
  await AuthService.resetPassword(token, newPassword);

  res.json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.',
  });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Get user
  const user = await AuthService.getUserById(userId);

  res.json({
    success: true,
    data: { user },
  });
});
