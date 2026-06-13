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

  it('flags a uniform high-speed scripted typing fixture deterministically', () => {
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

    expect(flags.map((flag) => flag.code)).toEqual([
      'sustained_high_typing_speed',
      'uniform_key_cadence',
    ]);
    expect(flags[0].evidence.charactersPerMinute).toBe(1040);
    expect(flags[1].evidence.stddevIntervalMs).toBe(4.5);
  });

  it('flags paste events when the writing environment blocks paste', () => {
    const flags = computeWritingAnomalyFlags(
      makeFeatures({ pasteEvents: 2 }),
      pasteBlockedEnvironment
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      code: 'paste_policy_violation',
      severity: 'critical',
      evidence: {
        pasteEvents: 2,
        policy: 'blocked',
      },
    });
  });

  it('summarizes brief away-from-workspace visibility as an informational review signal', () => {
    const flags = computeWritingAnomalyFlags(makeFeatures({
      awayFromWorkspace: {
        leftCount: 1,
        returnedCount: 1,
        totalAwayMs: 42_000,
        longestAwayMs: 42_000,
      },
    }));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      code: 'away_from_workspace',
      severity: 'info',
      label: 'Away from workspace',
      evidence: {
        leftCount: 1,
        returnedCount: 1,
        totalAwayTime: '42s',
        longestAwayTime: '42s',
      },
    });
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
      code: 'away_from_workspace',
      severity: 'warning',
      evidence: {
        totalAwayTime: '10min50s',
        longestAwayTime: '5min5s',
      },
    });
  });

  it('flags text influx and client/server timing mismatch without producing a verdict', () => {
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

    expect(flags.map((flag) => flag.code)).toEqual([
      'text_influx_without_input',
      'focus_text_influx',
      'clock_skew_anomaly',
    ]);
    expect(flags.every((flag) => flag.description.toLowerCase().includes('verdict'))).toBe(false);
  });

});

describe('buildAiPolicyRefusalFlag', () => {
  it('returns no flag when no refusals were recorded', () => {
    expect(buildAiPolicyRefusalFlag(0)).toBeNull();
  });

  it('builds a sealed anomaly flag payload for policy refusals', () => {
    expect(buildAiPolicyRefusalFlag(2)).toEqual({
      code: 'ai_policy_refusal',
      severity: 'warning',
      label: 'AI policy refusals',
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
        code: 'ai_policy_refusal',
        severity: 'warning',
        label: 'AI policy refusal',
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
});
