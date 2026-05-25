jest.mock('../../services/auth.service');
jest.mock('../../services/oauth.service', () => ({
  OAuthService: {
    getEnabledProviders: jest.fn(() => []),
    getAuthorizationUrl: jest.fn(),
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import { login, logout } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';

const MockAuthService = AuthService as jest.Mocked<typeof AuthService>;

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    cookies: {},
    user: undefined,
    ...overrides,
  } as Request;
}

function makeRes(): jest.Mocked<Response> {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

async function runController(
  handler: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
  next: NextFunction = jest.fn()
) {
  handler(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));
  return next;
}

describe('auth controller cookies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets httpOnly auth cookies with consistent security options on login', async () => {
    MockAuthService.login.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@mail.com',
        role: 'admin',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
    } as any);

    const req = makeReq({
      body: {
        email: 'admin@mail.com',
        password: 'Password123!',
        role: 'admin',
      },
    });
    const res = makeRes();

    await runController(login, req, res);

    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-1', expect.objectContaining({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }));
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access-token-1', expect.objectContaining({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        accessToken: 'access-token-1',
      }),
    }));
  });

  it('clears auth cookies with the same base options on logout', async () => {
    MockAuthService.logout.mockResolvedValue(undefined);

    const req = makeReq({
      user: { userId: 'admin-1', email: 'admin@mail.com' },
      cookies: {
        refreshToken: 'refresh-token-1',
      },
    } as any);
    const res = makeRes();

    await runController(logout, req, res);

    expect(MockAuthService.logout).toHaveBeenCalledWith('admin-1', 'refresh-token-1');
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    }));
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.objectContaining({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    }));
  });
});
