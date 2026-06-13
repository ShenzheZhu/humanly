import {
  AnomalyFlagsService,
  buildAiPolicyRefusalFlag,
  computeWritingAnomalyFlags,
  DEFAULT_ANOMALY_THRESHOLDS,
} from '../../services/anomaly-flags.service';
import {
  DocumentEventModel,
  type DocumentAnomalyAnalysisFeatures,
} from '../../models/document-event.model';
import type { WritingEnvironmentConfig } from '@humanly/shared';

jest.mock('../../models/document-event.model', () => ({
  DocumentEventModel: {
    getAnomalyAnalysisFeatures: jest.fn(),
    countByDocumentIdWithFilters: jest.fn(),
  },
}));

const MockDocumentEventModel = DocumentEventModel as jest.Mocked<typeof DocumentEventModel>;

function makeFeatures(
  overrides: Partial<DocumentAnomalyAnalysisFeatures> = {}
): DocumentAnomalyAnalysisFeatures {
  return {
    totalEvents: 80,
    typingEvents: 70,
    pasteEvents: 0,
    speed: {
      maxCharsInWindow: 80,
      windowSeconds: DEFAULT_ANOMALY_THRESHOLDS.highSpeedWindowSeconds,
      charsPerMinute: 160,
    },
    cadence: {
      intervalCount: 60,
      meanIntervalMs: 145,
      stddevIntervalMs: 62,
      minIntervalMs: 45,
      maxIntervalMs: 420,
    },
    textInflux: {
      eventType: null,
      timestamp: null,
      addedCharacters: 0,
    },
    focusInflux: {
      blurTimestamp: null,
      focusTimestamp: null,
      addedCharacters: 0,
    },
    awayFromWorkspace: {
      leftCount: 0,
      returnedCount: 0,
      totalAwayMs: 0,
      longestAwayMs: 0,
    },
    clockSkew: {
      sessionId: 'session-1',
      eventCount: 80,
      clientSpanSeconds: 180,
      serverSpanSeconds: 180,
    },
    copyPaste: {
      pasteEvents: 0,
      copyEvents: 0,
      cutEvents: 0,
      blockedAttempts: 0,
      pastedCharacters: 0,
      totalCharacters: 1000,
    },
    ...overrides,
  };
}

const pasteBlockedEnvironment = {
  copyPastePolicy: 'blocked',
} as WritingEnvironmentConfig;

describe('computeWritingAnomalyFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero flags for a human-like fixture', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures());

    expect(flags).toEqual([]);
  });

  it('merges high-speed typing into rapid text accumulation without surfacing cadence by default', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures({
      speed: {
        maxCharsInWindow: 520,
        windowSeconds: DEFAULT_ANOMALY_THRESHOLDS.highSpeedWindowSeconds,
        charsPerMinute: 1040,
      },
      cadence: {
        intervalCount: 140,
        meanIntervalMs: 75,
        stddevIntervalMs: 4.5,
        minIntervalMs: 70,
        maxIntervalMs: 82,
      },
    }));

    expect(flags.map((flag) => flag.code)).toEqual(['rapid_text_accumulation']);
    expect(flags[0].evidence.charactersPerMinute).toBe(1040);
    expect(flags[0].evidence.sources).toEqual(['typing_speed']);
    expect(flags[0].evidence.stddevIntervalMs).toBeUndefined();
  });

  it('flags copy-paste attempts when the writing environment blocks copy-paste', () => {
    const flags = computeWritingAnomalyFlags(
      makeFeatures({
        pasteEvents: 2,
        copyPaste: {
          pasteEvents: 2,
          copyEvents: 1,
          cutEvents: 1,
          blockedAttempts: 3,
          pastedCharacters: 0,
          totalCharacters: 1000,
        },
      }),
      pasteBlockedEnvironment
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      code: 'blocked_copy_paste_attempt',
      severity: 'critical',
      evidence: {
        blockedAttempts: 3,
        pasteEvents: 2,
        copyEvents: 1,
        cutEvents: 1,
        policy: 'blocked',
      },
    });
  });

  it('does not summarize brief away-from-workspace visibility as an abnormal behavior signal', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures({
      awayFromWorkspace: {
        leftCount: 1,
        returnedCount: 1,
        totalAwayMs: 42_000,
        longestAwayMs: 42_000,
      },
    }));

    expect(flags).toEqual([]);
  });

  it('marks repeated or long away-from-workspace visibility as a warning review signal', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures({
      awayFromWorkspace: {
        leftCount: 3,
        returnedCount: 3,
        totalAwayMs: 650_000,
        longestAwayMs: 305_000,
      },
    }));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      code: 'long_or_repeated_away_from_workspace',
      severity: 'warning',
      evidence: {
        totalAwayTime: '10min50s',
        longestAwayTime: '5min5s',
      },
    });
  });

  it('merges text influx sources and ignores client/server timing mismatch by default', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures({
      textInflux: {
        eventType: 'focus',
        timestamp: new Date('2026-06-12T12:00:00.000Z'),
        addedCharacters: 800,
      },
      focusInflux: {
        blurTimestamp: new Date('2026-06-12T11:58:00.000Z'),
        focusTimestamp: new Date('2026-06-12T12:00:00.000Z'),
        addedCharacters: 360,
      },
      clockSkew: {
        sessionId: 'session-2',
        eventCount: 120,
        clientSpanSeconds: 360,
        serverSpanSeconds: 2,
      },
    }));

    expect(flags.map((flag) => flag.code)).toEqual(['rapid_text_accumulation']);
    expect(flags[0]).toMatchObject({
      code: 'rapid_text_accumulation',
      evidence: {
        sources: ['untracked_input', 'after_refocus'],
        untrackedAddedCharacters: 800,
        refocusAddedCharacters: 360,
      },
    });
  });

  it('flags large paste volume as a review signal when copy-paste is allowed', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures({
      copyPaste: {
        pasteEvents: 4,
        copyEvents: 0,
        cutEvents: 0,
        blockedAttempts: 0,
        pastedCharacters: 800,
        totalCharacters: 2000,
      },
    }));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      code: 'large_paste_volume',
      severity: 'warning',
      evidence: {
        pasteEvents: 4,
        pastedCharacters: 800,
        pastedPercentage: 40,
      },
    });
  });
});

describe('buildAiPolicyRefusalFlag', () => {
  it('returns no flag when no refusals were recorded', () => {
    expect(buildAiPolicyRefusalFlag(0)).toBeNull();
  });

  it('builds a sealed anomaly flag payload for policy refusals', () => {
    expect(buildAiPolicyRefusalFlag(2)).toEqual({
      code: 'chat_refusal',
      severity: 'warning',
      label: 'Chat refusals',
      description:
        'The in-platform assistant refused a request because it conflicted with the active writing policy.',
      evidence: {
        refusalCount: 2,
        eventType: 'ai_policy_refusal',
      },
    });
  });
});

describe('AnomalyFlagsService.analyzeDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('freezes AI policy refusals into anomaly flags for certificate generation', async () => {
    MockDocumentEventModel.getAnomalyAnalysisFeatures.mockResolvedValue(makeFeatures());
    MockDocumentEventModel.countByDocumentIdWithFilters.mockResolvedValue(1);

    const flags = await AnomalyFlagsService.analyzeDocument('document-1');

    expect(flags).toEqual([
      {
        code: 'chat_refusal',
        severity: 'warning',
        label: 'Chat refusal',
        description:
          'The in-platform assistant refused a request because it conflicted with the active writing policy.',
        evidence: {
          refusalCount: 1,
          eventType: 'ai_policy_refusal',
        },
      },
    ]);
    expect(MockDocumentEventModel.countByDocumentIdWithFilters).toHaveBeenCalledWith(
      'document-1',
      { eventType: 'ai_policy_refusal' }
    );
  });

  it('preserves AI policy refusal flags when broad anomaly feature analysis fails', async () => {
    MockDocumentEventModel.getAnomalyAnalysisFeatures.mockRejectedValue(new Error('feature query failed'));
    MockDocumentEventModel.countByDocumentIdWithFilters.mockResolvedValue(2);

    const flags = await AnomalyFlagsService.analyzeDocument('document-2');

    expect(flags).toEqual([
      {
        code: 'chat_refusal',
        severity: 'warning',
        label: 'Chat refusals',
        description:
          'The in-platform assistant refused a request because it conflicted with the active writing policy.',
        evidence: {
          refusalCount: 2,
          eventType: 'ai_policy_refusal',
        },
      },
    ]);
    expect(MockDocumentEventModel.countByDocumentIdWithFilters).toHaveBeenCalledWith(
      'document-2',
      { eventType: 'ai_policy_refusal' }
    );
  });
});
