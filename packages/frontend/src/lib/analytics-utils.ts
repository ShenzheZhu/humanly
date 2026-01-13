import { EventType } from '@humory/shared';

// Real-time event interface
export interface RealtimeEvent {
  id: string;
  eventType: EventType;
  sessionId: string;
  userId: string;
  timestamp: string;
  fieldName?: string;
  keyCode?: string;
  keyChar?: string;
  textBefore?: string;
  textAfter?: string;
  cursorPosition?: number;
  metadata?: Record<string, any>;
}

// Constants
export const PAUSE_THRESHOLD = 2000; // milliseconds
export const BURST_THRESHOLD = 300; // milliseconds
export const BURST_MIN_LENGTH = 5; // minimum keys in a burst

// Formatting utilities
export const formatDuration = (ms: number): string => {
  if (ms === 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatNumber = (num: number, decimals: number = 1): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatPercentage = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

// Speed Metrics
export const calculateWPM = (events: RealtimeEvent[]): number => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown' && e.keyChar);

    if (keyEvents.length < 2) return 0;

    const firstEvent = keyEvents[keyEvents.length - 1];
    const lastEvent = keyEvents[0];
    const duration = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();

    const minutes = duration / 60000;
    const characters = keyEvents.length;

    return minutes > 0 ? (characters / 5) / minutes : 0;
  } catch (error) {
    console.error('Error calculating WPM:', error);
    return 0;
  }
};

export const calculateCPM = (events: RealtimeEvent[]): number => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown' && e.keyChar);

    if (keyEvents.length < 2) return 0;

    const firstEvent = keyEvents[keyEvents.length - 1];
    const lastEvent = keyEvents[0];
    const duration = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();

    const minutes = duration / 60000;

    return minutes > 0 ? keyEvents.length / minutes : 0;
  } catch (error) {
    console.error('Error calculating CPM:', error);
    return 0;
  }
};

// Timing Metrics
export const calculateAvgTimeBetweenKeys = (events: RealtimeEvent[]): number => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown');

    if (keyEvents.length < 2) return 0;

    let totalTime = 0;
    for (let i = 1; i < keyEvents.length; i++) {
      const timeDiff = new Date(keyEvents[i-1].timestamp).getTime() - new Date(keyEvents[i].timestamp).getTime();
      totalTime += timeDiff;
    }

    return totalTime / (keyEvents.length - 1);
  } catch (error) {
    console.error('Error calculating avg time between keys:', error);
    return 0;
  }
};

export const detectPauses = (events: RealtimeEvent[]): { pauseCount: number; longestPause: number } => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown' || e.eventType === 'input');

    if (keyEvents.length < 2) return { pauseCount: 0, longestPause: 0 };

    let pauseCount = 0;
    let longestPause = 0;

    for (let i = 1; i < keyEvents.length; i++) {
      const timeDiff = new Date(keyEvents[i-1].timestamp).getTime() - new Date(keyEvents[i].timestamp).getTime();

      if (timeDiff > PAUSE_THRESHOLD) {
        pauseCount++;
        longestPause = Math.max(longestPause, timeDiff);
      }
    }

    return { pauseCount, longestPause };
  } catch (error) {
    console.error('Error detecting pauses:', error);
    return { pauseCount: 0, longestPause: 0 };
  }
};

export const calculateActiveTypingTime = (events: RealtimeEvent[]): number => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown');

    if (keyEvents.length < 2) return 0;

    let activeTime = 0;

    for (let i = 1; i < keyEvents.length; i++) {
      const timeDiff = new Date(keyEvents[i-1].timestamp).getTime() - new Date(keyEvents[i].timestamp).getTime();

      if (timeDiff <= PAUSE_THRESHOLD) {
        activeTime += timeDiff;
      }
    }

    return activeTime;
  } catch (error) {
    console.error('Error calculating active typing time:', error);
    return 0;
  }
};

// Error Correction Metrics
export const calculateDeletionMetrics = (events: RealtimeEvent[]): { deletionCount: number; deletionRate: number } => {
  try {
    const deleteEvents = events.filter(e => e.eventType === 'delete');
    const deletionCount = deleteEvents.length;

    const inputEvents = events.filter(e => e.eventType === 'keydown' && e.keyChar);

    const deletionRate = inputEvents.length > 0 ? deletionCount / inputEvents.length : 0;

    return { deletionCount, deletionRate };
  } catch (error) {
    console.error('Error calculating deletion metrics:', error);
    return { deletionCount: 0, deletionRate: 0 };
  }
};

export const detectErrorCorrectionSequences = (events: RealtimeEvent[]): number => {
  try {
    let sequenceCount = 0;
    let inSequence = false;

    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].eventType === 'delete') {
        if (!inSequence) {
          sequenceCount++;
          inSequence = true;
        }
      } else if (events[i].eventType === 'keydown') {
        inSequence = false;
      }
    }

    return sequenceCount;
  } catch (error) {
    console.error('Error detecting error correction sequences:', error);
    return 0;
  }
};

// Copy-Paste Statistics
export const calculatePasteStatistics = (events: RealtimeEvent[]): {
  pasteCount: number;
  copyCount: number;
  cutCount: number;
  pastedCharacterCount: number;
  pasteRatio: number;
} => {
  try {
    const pasteEvents = events.filter(e => e.eventType === 'paste');
    const copyEvents = events.filter(e => e.eventType === 'copy');
    const cutEvents = events.filter(e => e.eventType === 'cut');

    let pastedCharacterCount = 0;
    pasteEvents.forEach(e => {
      if (e.metadata?.pastedText) {
        pastedCharacterCount += e.metadata.pastedText.length;
      }
    });

    const lastEvent = events[0];
    const totalCharacters = lastEvent?.textAfter?.length || 0;

    const pasteRatio = totalCharacters > 0 ? (pastedCharacterCount / totalCharacters) * 100 : 0;

    return {
      pasteCount: pasteEvents.length,
      copyCount: copyEvents.length,
      cutCount: cutEvents.length,
      pastedCharacterCount,
      pasteRatio
    };
  } catch (error) {
    console.error('Error calculating paste statistics:', error);
    return {
      pasteCount: 0,
      copyCount: 0,
      cutCount: 0,
      pastedCharacterCount: 0,
      pasteRatio: 0
    };
  }
};

// Burst Detection
export const detectBursts = (events: RealtimeEvent[]): { burstCount: number; burstSpeed: number } => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown' && e.keyChar);

    if (keyEvents.length < BURST_MIN_LENGTH) return { burstCount: 0, burstSpeed: 0 };

    let burstCount = 0;
    let currentBurst = 0;
    let burstChars = 0;
    let burstTime = 0;

    for (let i = 1; i < keyEvents.length; i++) {
      const timeDiff = new Date(keyEvents[i-1].timestamp).getTime() - new Date(keyEvents[i].timestamp).getTime();

      if (timeDiff < BURST_THRESHOLD) {
        currentBurst++;
        burstChars++;
        burstTime += timeDiff;
      } else {
        if (currentBurst >= BURST_MIN_LENGTH) {
          burstCount++;
        }
        currentBurst = 0;
      }
    }

    // Check last burst
    if (currentBurst >= BURST_MIN_LENGTH) {
      burstCount++;
    }

    const burstSpeed = burstTime > 0 ? ((burstChars / 5) / (burstTime / 60000)) : 0;

    return { burstCount, burstSpeed };
  } catch (error) {
    console.error('Error detecting bursts:', error);
    return { burstCount: 0, burstSpeed: 0 };
  }
};

// Session Metrics
export const calculateSessionDuration = (events: RealtimeEvent[]): number => {
  try {
    if (events.length < 2) return 0;

    const firstEvent = events[events.length - 1];
    const lastEvent = events[0];

    return new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();
  } catch (error) {
    console.error('Error calculating session duration:', error);
    return 0;
  }
};

export const calculateCharacterCount = (events: RealtimeEvent[]): number => {
  try {
    const lastEvent = events[0];
    return lastEvent?.textAfter?.length || 0;
  } catch (error) {
    console.error('Error calculating character count:', error);
    return 0;
  }
};

export const calculateWordCount = (events: RealtimeEvent[]): number => {
  try {
    const characterCount = calculateCharacterCount(events);
    return Math.round(characterCount / 5);
  } catch (error) {
    console.error('Error calculating word count:', error);
    return 0;
  }
};

export const calculateTextGrowthRate = (events: RealtimeEvent[]): number => {
  try {
    const inputEvents = events.filter(e => e.eventType === 'keydown' && e.keyChar);
    const deleteEvents = events.filter(e => e.eventType === 'delete');

    const netCharacters = inputEvents.length - deleteEvents.length;
    const duration = calculateSessionDuration(events);
    const minutes = duration / 60000;

    return minutes > 0 ? netCharacters / minutes : 0;
  } catch (error) {
    console.error('Error calculating text growth rate:', error);
    return 0;
  }
};

// Behavior Metrics
export const calculateFocusChangeCount = (events: RealtimeEvent[]): number => {
  try {
    const focusEvents = events.filter(e => e.eventType === 'focus' || e.eventType === 'blur');
    return focusEvents.length;
  } catch (error) {
    console.error('Error calculating focus change count:', error);
    return 0;
  }
};

export const calculateTypingConsistency = (events: RealtimeEvent[]): number => {
  try {
    const keyEvents = events.filter(e => e.eventType === 'keydown');

    if (keyEvents.length < 3) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < keyEvents.length; i++) {
      const timeDiff = new Date(keyEvents[i-1].timestamp).getTime() - new Date(keyEvents[i].timestamp).getTime();
      if (timeDiff <= PAUSE_THRESHOLD) { // Only consider typing intervals, not pauses
        intervals.push(timeDiff);
      }
    }

    if (intervals.length < 2) return 0;

    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (lower is more consistent)
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

    // Return consistency score (inverse of CV, capped at 100)
    return Math.max(0, 100 - cv);
  } catch (error) {
    console.error('Error calculating typing consistency:', error);
    return 0;
  }
};
