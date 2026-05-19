import {
  createTaskSchema,
  DEFAULT_WRITING_ENVIRONMENT_CONFIG,
  SUBMISSION_MIN_CHARACTERS_MAX,
} from '@humanly/shared';

describe('writing environment validators', () => {
  const baseTaskPayload = {
    name: 'Minimum character task',
    startDate: new Date('2026-05-19T12:00:00.000Z'),
    endDate: new Date('2026-05-20T12:00:00.000Z'),
  };

  it('accepts an optional minimum submission character count', () => {
    const result = createTaskSchema.parse({
      ...baseTaskPayload,
      environmentConfig: {
        ...DEFAULT_WRITING_ENVIRONMENT_CONFIG,
        taskType: 'admin_assigned',
        submission: {
          mode: 'multiple',
          minCharacters: 1000,
        },
      },
    });

    expect(result.environmentConfig?.submission.minCharacters).toBe(1000);
  });

  it('rejects minimum submission character counts above the supported maximum', () => {
    expect(() => createTaskSchema.parse({
      ...baseTaskPayload,
      environmentConfig: {
        ...DEFAULT_WRITING_ENVIRONMENT_CONFIG,
        taskType: 'admin_assigned',
        submission: {
          mode: 'multiple',
          minCharacters: SUBMISSION_MIN_CHARACTERS_MAX + 1,
        },
      },
    })).toThrow();
  });
});
