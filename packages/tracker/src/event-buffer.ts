import { TrackerConfig, TrackerEvent } from './types';

/**
 * EventBuffer manages batching of events before sending to the backend
 */
export class EventBuffer {
  private events: TrackerEvent[] = [];
  private createdAt: number;
  private flushTimer: number | null = null;
  private readonly maxBatchSize: number;
  private readonly maxBatchTime: number;
  private readonly flushCallback: (events: TrackerEvent[]) => Promise<void>;
  private readonly debug: boolean;

  constructor(
    config: TrackerConfig,
    flushCallback: (events: TrackerEvent[]) => Promise<void>
  ) {
    this.maxBatchSize = config.maxBatchSize || 20;
    this.maxBatchTime = (config.maxBatchTime || 30) * 1000; // Convert to ms
    this.flushCallback = flushCallback;
    this.debug = config.debug || false;
    this.createdAt = Date.now();

    // Set up periodic flush timer
    this.startFlushTimer();
  }

  /**
   * Add an event to the buffer
   */
  add(event: TrackerEvent): void {
    this.events.push(event);

    if (this.debug) {
      console.log(`[Humanly] Event buffered (${this.events.length}/${this.maxBatchSize}):`, event);
    }

    // Check if we should flush based on batch size
    if (this.shouldFlush()) {
      this.flush();
    }
  }

  /**
   * Check if buffer should be flushed
   */
  shouldFlush(): boolean {
    // Flush if we've reached max batch size
    if (this.events.length >= this.maxBatchSize) {
      return true;
    }

    // Flush if max batch time has elapsed
    if (Date.now() - this.createdAt >= this.maxBatchTime) {
      return true;
    }

    return false;
  }

  /**
   * Flush all events to the backend
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    const eventsToSend = [...this.events];
    this.clear();

    if (this.debug) {
      console.log(`[Humanly] Flushing ${eventsToSend.length} events`);
    }

    try {
      await this.flushCallback(eventsToSend);

      if (this.debug) {
        console.log('[Humanly] Events flushed successfully');
      }
    } catch (error) {
      if (this.debug) {
        console.error('[Humanly] Failed to flush events:', error);
      }
      // Re-add events to buffer on failure (at the front)
      this.events = [...eventsToSend, ...this.events];
    }
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.events = [];
    this.createdAt = Date.now();
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.events.length;
  }

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      if (this.shouldFlush()) {
        this.flush();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop the flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Destroy the buffer and clean up
   */
  async destroy(): Promise<void> {
    this.stopFlushTimer();
    await this.flush(); // Flush any remaining events
  }
}
