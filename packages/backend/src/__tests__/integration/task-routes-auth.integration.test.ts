jest.mock('../../services/task.service', () => ({
  TaskService: {
    createTask: jest.fn(),
    getTask: jest.fn(),
    listTasks: jest.fn(),
    joinTaskByInviteCode: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import request from 'supertest';
import { createApp } from '../../app';
import { TaskService } from '../../services/task.service';
import { generateAccessToken } from '../../utils/jwt';

const MockTaskService = TaskService as jest.Mocked<typeof TaskService>;
const app = createApp();

function tokenFor(role: 'admin' | 'user'): string {
  return generateAccessToken({
    userId: `${role}-1`,
    email: `${role}@example.com`,
    role,
  });
}

function validTaskPayload() {
  return {
    name: 'Role Guard Task',
    description: 'Regression coverage for admin task role guard',
    startDate: new Date(Date.now() - 60_000).toISOString(),
    endDate: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe('task route role boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects user-role tokens on admin task owner endpoints', async () => {
    const userToken = tokenFor('user');

    const listResponse = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${userToken}`);
    expect(listResponse.status).toBe(403);

    const createResponse = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validTaskPayload());
    expect(createResponse.status).toBe(403);

    const detailResponse = await request(app)
      .get('/api/v1/tasks/task-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(detailResponse.status).toBe(403);

    expect(MockTaskService.listTasks).not.toHaveBeenCalled();
    expect(MockTaskService.createTask).not.toHaveBeenCalled();
    expect(MockTaskService.getTask).not.toHaveBeenCalled();
  });

  it('allows admin-role tokens to create admin tasks', async () => {
    MockTaskService.createTask.mockResolvedValue({
      id: 'task-1',
      userId: 'admin-1',
      name: 'Role Guard Task',
      description: 'Regression coverage for admin task role guard',
      taskToken: 'ABCDEF123456',
      startDate: new Date(),
      endDate: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send(validTaskPayload());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(MockTaskService.createTask).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({ name: 'Role Guard Task' })
    );
  });

  it('keeps user enrollment endpoints available to user-role tokens', async () => {
    MockTaskService.joinTaskByInviteCode.mockResolvedValue({
      id: 'task-1',
      name: 'Enrollment Task',
      description: null,
      startDate: new Date(),
      endDate: new Date(),
      environmentConfig: null,
      enrolledUserCount: 1,
      taskToken: 'ABCDEF123456',
    } as any);

    const response = await request(app)
      .post('/api/v1/tasks/join')
      .set('Authorization', `Bearer ${tokenFor('user')}`)
      .send({ inviteCode: 'ABCDEF' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(MockTaskService.joinTaskByInviteCode).toHaveBeenCalledWith('ABCDEF', 'user-1');
  });
});
