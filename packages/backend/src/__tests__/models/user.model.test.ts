const mockClient = {
  query: jest.fn(),
};

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  transaction: jest.fn((callback) => callback(mockClient)),
}));

import { UserModel } from '../../models/user.model';
import { transaction } from '../../config/database';

const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('UserModel.deleteAccount', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
    mockTransaction.mockClear();
  });

  it('cleans non-cascading peer-review references before deleting the user row', async () => {
    mockClient.query.mockImplementation(async (sql: string) => ({
      rowCount: sql.includes('DELETE FROM users') ? 1 : 0,
    }));

    await expect(UserModel.deleteAccount('user-1')).resolves.toBe(true);

    const statements = mockClient.query.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual([
      'DELETE FROM paper_access_logs WHERE reviewer_id = $1',
      'DELETE FROM review_recordings WHERE reviewer_id = $1',
      'DELETE FROM review_ai_interaction_logs WHERE reviewer_id = $1',
      'DELETE FROM review_ai_sessions WHERE reviewer_id = $1',
      'DELETE FROM review_comments WHERE reviewer_id = $1',
      'DELETE FROM review_events WHERE reviewer_id = $1',
      'DELETE FROM reviews WHERE reviewer_id = $1',
      'DELETE FROM paper_reviewers WHERE reviewer_id = $1 OR assigned_by = $1',
      'DELETE FROM papers WHERE uploaded_by = $1',
      'DELETE FROM users WHERE id = $1',
    ]);
    expect(mockClient.query).toHaveBeenLastCalledWith('DELETE FROM users WHERE id = $1', ['user-1']);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns false when no user row was deleted', async () => {
    mockClient.query.mockResolvedValue({ rowCount: 0 });

    await expect(UserModel.deleteAccount('missing-user')).resolves.toBe(false);
  });
});
