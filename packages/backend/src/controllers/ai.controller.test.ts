import assert from 'node:assert/strict';
import { trackSelectionAction } from './ai.controller';
import { AIModel } from '../models/ai.model';
import { AISelectionActionModel } from '../models/ai-selection-action.model';
import { DocumentModel } from '../models/document.model';
import { AppError } from '../middleware/error-handler';

type MockState = {
  actionCreates: any[];
  findLogCalls: string[];
  updateResponses: any[];
  modifications: any[];
};

const ownerUserId = 'user-owner';
const otherUserId = 'user-other';
const documentId = 'document-owner';
const otherDocumentId = 'document-other';
const logId = 'ai-log-owner';

const originals = {
  canAccess: DocumentModel.canAccess,
  findLogById: AIModel.findLogById,
  findRecentSelectionLog: AIModel.findRecentSelectionLog,
  createLog: AIModel.createLog,
  updateLogWithResponse: AIModel.updateLogWithResponse,
  updateLogWithModifications: AIModel.updateLogWithModifications,
  createAction: AISelectionActionModel.create,
};

function restoreOriginals() {
  DocumentModel.canAccess = originals.canAccess;
  AIModel.findLogById = originals.findLogById;
  AIModel.findRecentSelectionLog = originals.findRecentSelectionLog;
  AIModel.createLog = originals.createLog;
  AIModel.updateLogWithResponse = originals.updateLogWithResponse;
  AIModel.updateLogWithModifications = originals.updateLogWithModifications;
  AISelectionActionModel.create = originals.createAction;
}

function installMocks(options: {
  canAccessDocument?: boolean;
  existingLog?: { id: string; userId: string; documentId: string } | null;
} = {}): MockState {
  const state: MockState = {
    actionCreates: [],
    findLogCalls: [],
    updateResponses: [],
    modifications: [],
  };

  DocumentModel.canAccess = async () => options.canAccessDocument ?? true;
  AIModel.findLogById = async (id: string) => {
    state.findLogCalls.push(id);
    const existingLog = options.existingLog === undefined
      ? { id, userId: ownerUserId, documentId }
      : options.existingLog;
    return existingLog as any;
  };
  AIModel.findRecentSelectionLog = async () => null;
  AIModel.createLog = async () => ({ id: 'created-log', userId: ownerUserId, documentId } as any);
  AIModel.updateLogWithResponse = async (id: string, response: any) => {
    state.updateResponses.push({ id, response });
    return {} as any;
  };
  AIModel.updateLogWithModifications = async (id: string, modifications: any[]) => {
    state.modifications.push({ id, modifications });
    return {} as any;
  };
  AISelectionActionModel.create = async (input: any) => {
    state.actionCreates.push(input);
    return {
      id: 'selection-action-id',
      ...input,
      finalText: input.decision === 'accepted' ? input.suggestedText : input.originalText,
      createdAt: new Date('2026-06-19T00:00:00.000Z'),
    };
  };

  return state;
}

function makeRequest(body: Record<string, unknown>) {
  return {
    user: { userId: ownerUserId },
    body: {
      documentId,
      logId,
      actionType: 'improve',
      originalText: 'rough text',
      suggestedText: 'polished text',
      decision: 'accepted',
      ...body,
    },
  } as any;
}

function makeResponse() {
  return {
    payload: undefined as any,
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  } as any;
}

async function expectAppError(
  label: string,
  expectedStatusCode: number,
  fn: () => Promise<void>,
) {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof AppError, `${label}: expected AppError`);
    assert.equal(error.statusCode, expectedStatusCode, `${label}: status code`);
    return;
  }

  assert.fail(`${label}: expected request to fail`);
}

async function run() {
  try {
    {
      const state = installMocks({ canAccessDocument: false });
      await expectAppError('cross-user document', 404, async () => {
        await trackSelectionAction(makeRequest({}), makeResponse());
      });
      assert.equal(state.actionCreates.length, 0, 'cross-user document must not create action');
      assert.equal(state.findLogCalls.length, 0, 'cross-user document must not inspect log');
    }

    {
      const state = installMocks({
        existingLog: { id: logId, userId: otherUserId, documentId },
      });
      await expectAppError('cross-user log', 403, async () => {
        await trackSelectionAction(makeRequest({}), makeResponse());
      });
      assert.equal(state.actionCreates.length, 0, 'cross-user log must not create action');
    }

    {
      const state = installMocks({
        existingLog: { id: logId, userId: ownerUserId, documentId: otherDocumentId },
      });
      await expectAppError('cross-document log', 400, async () => {
        await trackSelectionAction(makeRequest({}), makeResponse());
      });
      assert.equal(state.actionCreates.length, 0, 'cross-document log must not create action');
    }

    {
      const state = installMocks();
      const res = makeResponse();
      await trackSelectionAction(makeRequest({ decision: 'accepted' }), res);

      assert.equal(res.payload.success, true, 'accepted accessible request succeeds');
      assert.equal(state.actionCreates.length, 1, 'accepted accessible request creates action');
      assert.equal(state.updateResponses[0].id, logId, 'accepted accessible request updates supplied log');
      assert.equal(state.updateResponses[0].response.status, 'success', 'accepted accessible request marks log success');
      assert.equal(state.modifications.length, 1, 'accepted accessible request mirrors modification');
    }

    {
      const state = installMocks({ canAccessDocument: true });
      const res = makeResponse();
      await trackSelectionAction(makeRequest({ logId: undefined, decision: 'accepted' }), res);

      assert.equal(res.payload.success, true, 'task-enrolled accessible request succeeds');
      assert.equal(state.actionCreates.length, 1, 'task-enrolled accessible request creates action');
      assert.equal(state.findLogCalls.length, 0, 'task-enrolled accessible request can create a fresh log');
      assert.equal(state.updateResponses[0].id, 'created-log', 'task-enrolled accessible request updates created log');
    }

    {
      const state = installMocks();
      const res = makeResponse();
      await trackSelectionAction(makeRequest({ decision: 'rejected' }), res);

      assert.equal(res.payload.success, true, 'rejected accessible request succeeds');
      assert.equal(state.actionCreates.length, 1, 'rejected accessible request creates action');
      assert.equal(state.updateResponses[0].response.status, 'cancelled', 'rejected accessible request cancels log');
      assert.equal(state.modifications.length, 0, 'rejected accessible request does not mirror modification');
    }
  } finally {
    restoreOriginals();
  }
}

void run().catch((error) => {
  restoreOriginals();
  console.error(error);
  process.exitCode = 1;
});
