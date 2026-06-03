jest.mock('../../services/auth.service');
jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import { register, updateCurrentUser } from '../../controllers/auth.controller';
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

describe('auth controller profile names', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes first and last name through registration', async () => {
    const createdUser = {
      id: 'user-1',
      email: 'writer@mail.com',
      role: 'user',
      name: 'Writer One',
      firstName: 'Writer',
      lastName: 'One',
      profileCompleted: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MockAuthService.register.mockResolvedValue(createdUser);

    const req = makeReq({
      body: {
        email: 'writer@mail.com',
        password: 'Password123!',
        firstName: ' Writer ',
        lastName: ' One ',
        role: 'user',
      },
    });
    const res = makeRes();

    await runController(register, req, res);

    expect(MockAuthService.register).toHaveBeenCalledWith(
      'writer@mail.com',
      'Password123!',
      'Writer',
      'One',
      'user'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: { user: createdUser },
    }));
  });

  it('updates the current user profile through PATCH /auth/me', async () => {
    const updatedUser = {
      id: 'user-1',
      email: 'writer@mail.com',
      role: 'user',
      name: 'Writer Two',
      firstName: 'Writer',
      lastName: 'Two',
      profileCompleted: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MockAuthService.updateUserProfile.mockResolvedValue(updatedUser);

    const req = makeReq({
      user: { userId: 'user-1', email: 'writer@mail.com' },
      body: { firstName: ' Writer ', lastName: ' Two ' },
    } as any);
    const res = makeRes();

    await runController(updateCurrentUser, req, res);

    expect(MockAuthService.updateUserProfile).toHaveBeenCalledWith('user-1', {
      firstName: 'Writer',
      lastName: 'Two',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { user: updatedUser },
    });
  });
});
