import { trackerEventSchema } from '@humanly/shared';

describe('page visibility event types', () => {
  it('accepts page visibility events in the shared tracker event schema', () => {
    expect(
      trackerEventSchema.safeParse({
        eventType: 'page_hidden',
        timestamp: '2026-05-14T12:00:02.000Z',
        metadata: { visibilityState: 'hidden' },
      }).success
    ).toBe(true);

    expect(
      trackerEventSchema.safeParse({
        eventType: 'page_visible',
        timestamp: '2026-05-14T12:01:57.000Z',
        metadata: { visibilityState: 'visible', hiddenDurationMs: 115000 },
      }).success
    ).toBe(true);
  });
});
