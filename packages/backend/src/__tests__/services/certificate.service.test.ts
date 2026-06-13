jest.mock('../../models/ai-selection-action.model');
jest.mock('../../models/ai.model');
jest.mock('../../models/document-event.model');
jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { CertificateService } from '../../services/certificate.service';
import { AISelectionActionModel } from '../../models/ai-selection-action.model';
import { AIModel } from '../../models/ai.model';
import { DocumentEventModel } from '../../models/document-event.model';

const MockSelectionActionModel = AISelectionActionModel as jest.Mocked<typeof AISelectionActionModel>;
const MockAIModel = AIModel as jest.Mocked<typeof AIModel>;
const MockDocumentEventModel = DocumentEventModel as jest.Mocked<typeof DocumentEventModel>;

describe('CertificateService.getAIAuthorshipStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes structured AI policy refusal counts from document events', async () => {
    MockSelectionActionModel.getStatsByDocumentId.mockResolvedValue({
      totalActions: 4,
      grammarActions: 1,
      improveActions: 1,
      simplifyActions: 1,
      formalActions: 1,
      acceptedCount: 3,
      rejectedCount: 1,
      acceptanceRate: 75,
    });
    MockAIModel.getQuestionStatsByDocument.mockResolvedValue({
      totalQuestions: 2,
      understandingQuestions: 1,
      generationQuestions: 1,
      otherQuestions: 0,
    });
    MockDocumentEventModel.countByDocumentIdWithFilters.mockResolvedValue(2);

    const stats = await CertificateService.getAIAuthorshipStats('document-1');

    expect(stats.policyRefusals).toEqual({ total: 2 });
    expect(MockDocumentEventModel.countByDocumentIdWithFilters).toHaveBeenCalledWith(
      'document-1',
      { eventType: 'ai_policy_refusal' }
    );
  });
});
