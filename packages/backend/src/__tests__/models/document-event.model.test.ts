jest.mock('../../config/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

import { query } from '../../config/database';
import { DocumentEventModel } from '../../models/document-event.model';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('DocumentEventModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue([]);
  });

  describe('batchInsert', () => {
    it('preserves empty text snapshots instead of coercing them to null', async () => {
      await DocumentEventModel.batchInsert([
        {
          documentId: 'doc-1',
          userId: 'user-1',
          eventType: 'delete',
          timestamp: new Date('2026-05-20T12:00:00.000Z'),
          keyCode: 'Backspace',
          textBefore: 'Whole document text',
          textAfter: '',
          cursorPosition: 0,
          selectionStart: 0,
          selectionEnd: 0,
        },
      ]);

      const params = mockQuery.mock.calls[0][1] as unknown[];

      expect(params[7]).toBe('Whole document text');
      expect(params[8]).toBe('');
    });
  });

  describe('getAwayFromWorkspaceStats', () => {
    it('computes rapid leave-return switching inside the configured window', async () => {
      mockQuery.mockResolvedValue([
        {
          eventType: 'page_hidden',
          timestamp: new Date('2026-06-12T12:00:00.000Z'),
          awayMs: 0,
        },
        {
          eventType: 'page_visible',
          timestamp: new Date('2026-06-12T12:00:03.000Z'),
          awayMs: 3000,
        },
        {
          eventType: 'page_hidden',
          timestamp: new Date('2026-06-12T12:00:30.000Z'),
          awayMs: 0,
        },
        {
          eventType: 'page_visible',
          timestamp: new Date('2026-06-12T12:00:33.000Z'),
          awayMs: 3000,
        },
        {
          eventType: 'page_hidden',
          timestamp: new Date('2026-06-12T12:01:20.000Z'),
          awayMs: 0,
        },
        {
          eventType: 'page_visible',
          timestamp: new Date('2026-06-12T12:01:28.000Z'),
          awayMs: 8000,
        },
      ]);

      const stats = await DocumentEventModel.getAwayFromWorkspaceStats('doc-1', 90);

      expect(stats).toEqual({
        leftCount: 3,
        returnedCount: 3,
        totalAwayMs: 14000,
        longestAwayMs: 8000,
        rapidSwitchCount: 6,
        rapidSwitchWindowMs: 88000,
        rapidSwitchWindowStart: '2026-06-12T12:00:00.000Z',
        rapidSwitchWindowEnd: '2026-06-12T12:01:28.000Z',
      });
    });

    it('does not count a single long absence as rapid switching', async () => {
      mockQuery.mockResolvedValue([
        {
          eventType: 'page_hidden',
          timestamp: '2026-06-12T12:00:00.000Z',
          awayMs: 0,
        },
        {
          eventType: 'page_visible',
          timestamp: '2026-06-12T12:12:00.000Z',
          awayMs: 720000,
        },
      ]);

      const stats = await DocumentEventModel.getAwayFromWorkspaceStats('doc-1', 90);

      expect(stats).toMatchObject({
        leftCount: 1,
        returnedCount: 1,
        totalAwayMs: 720000,
        longestAwayMs: 720000,
        rapidSwitchCount: 0,
        rapidSwitchWindowMs: 0,
        rapidSwitchWindowStart: null,
        rapidSwitchWindowEnd: null,
      });
    });
  });
});
