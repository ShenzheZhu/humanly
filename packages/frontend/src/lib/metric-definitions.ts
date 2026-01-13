import {
  Zap,
  Clock,
  Activity,
  Target,
  Clipboard,
  Timer,
  TrendingUp,
  Hash,
  FileText,
  AlertCircle,
  Copy,
  Scissors,
  Pause,
  Focus,
  BarChart3,
  type LucideIcon
} from 'lucide-react';
import type { RealtimeEvent } from './analytics-utils';
import {
  calculateWPM,
  calculateCPM,
  calculateAvgTimeBetweenKeys,
  detectPauses,
  calculateActiveTypingTime,
  calculateDeletionMetrics,
  detectErrorCorrectionSequences,
  calculatePasteStatistics,
  detectBursts,
  calculateSessionDuration,
  calculateCharacterCount,
  calculateWordCount,
  calculateTextGrowthRate,
  calculateFocusChangeCount,
  calculateTypingConsistency,
  formatDuration,
  formatNumber,
  formatPercentage
} from './analytics-utils';

export type MetricCategory = 'speed' | 'timing' | 'behavior' | 'quality' | 'session';

export interface MetricDefinition {
  id: string;
  label: string;
  category: MetricCategory;
  description: string;
  icon: LucideIcon;
  unit: string;
  formatter: (value: number) => string;
  calculator: (events: RealtimeEvent[]) => number;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Speed Metrics
  {
    id: 'wpm',
    label: 'Words Per Minute',
    category: 'speed',
    description: 'Average typing speed calculated as (characters / 5) / minutes',
    icon: Zap,
    unit: 'WPM',
    formatter: (v) => `${formatNumber(v, 1)} WPM`,
    calculator: calculateWPM
  },
  {
    id: 'cpm',
    label: 'Characters Per Minute',
    category: 'speed',
    description: 'Raw character input rate per minute',
    icon: TrendingUp,
    unit: 'CPM',
    formatter: (v) => `${formatNumber(v, 0)} CPM`,
    calculator: calculateCPM
  },
  {
    id: 'burstSpeed',
    label: 'Burst Speed',
    category: 'speed',
    description: 'Peak typing speed during rapid typing sequences',
    icon: Zap,
    unit: 'WPM',
    formatter: (v) => `${formatNumber(v, 1)} WPM`,
    calculator: (events) => detectBursts(events).burstSpeed
  },

  // Timing Metrics
  {
    id: 'avgTimeBetweenKeys',
    label: 'Avg Time Between Keys',
    category: 'timing',
    description: 'Average interval between consecutive keystrokes',
    icon: Clock,
    unit: 'ms',
    formatter: (v) => `${formatNumber(v, 0)} ms`,
    calculator: calculateAvgTimeBetweenKeys
  },
  {
    id: 'pauseCount',
    label: 'Pause Count',
    category: 'timing',
    description: 'Number of pauses longer than 2 seconds',
    icon: Pause,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: (events) => detectPauses(events).pauseCount
  },
  {
    id: 'longestPause',
    label: 'Longest Pause',
    category: 'timing',
    description: 'Duration of the longest pause in typing',
    icon: Timer,
    unit: '',
    formatter: (v) => formatDuration(v),
    calculator: (events) => detectPauses(events).longestPause
  },
  {
    id: 'activeTypingTime',
    label: 'Active Typing Time',
    category: 'timing',
    description: 'Total time actively typing (excluding pauses)',
    icon: Activity,
    unit: '',
    formatter: (v) => formatDuration(v),
    calculator: calculateActiveTypingTime
  },

  // Behavior Metrics
  {
    id: 'burstCount',
    label: 'Burst Count',
    category: 'behavior',
    description: 'Number of rapid typing sequences detected',
    icon: Activity,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: (events) => detectBursts(events).burstCount
  },
  {
    id: 'focusChangeCount',
    label: 'Focus Changes',
    category: 'behavior',
    description: 'Number of times focus entered or left the field',
    icon: Focus,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: calculateFocusChangeCount
  },
  {
    id: 'typingConsistency',
    label: 'Typing Consistency',
    category: 'behavior',
    description: 'Consistency score based on keystroke timing variance (higher is better)',
    icon: BarChart3,
    unit: '',
    formatter: (v) => `${formatNumber(v, 0)}%`,
    calculator: calculateTypingConsistency
  },

  // Quality Metrics
  {
    id: 'deletionCount',
    label: 'Deletion Count',
    category: 'quality',
    description: 'Total number of backspace/delete operations',
    icon: AlertCircle,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: (events) => calculateDeletionMetrics(events).deletionCount
  },
  {
    id: 'deletionRate',
    label: 'Deletion Rate',
    category: 'quality',
    description: 'Ratio of deletions to characters typed',
    icon: Target,
    unit: '',
    formatter: (v) => formatPercentage(v * 100),
    calculator: (events) => calculateDeletionMetrics(events).deletionRate
  },
  {
    id: 'errorCorrectionSequences',
    label: 'Error Correction Sequences',
    category: 'quality',
    description: 'Number of consecutive deletion sequences (backspacing)',
    icon: AlertCircle,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: detectErrorCorrectionSequences
  },

  // Copy-Paste Metrics
  {
    id: 'pasteCount',
    label: 'Paste Count',
    category: 'behavior',
    description: 'Number of paste operations',
    icon: Clipboard,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: (events) => calculatePasteStatistics(events).pasteCount
  },
  {
    id: 'copyCount',
    label: 'Copy Count',
    category: 'behavior',
    description: 'Number of copy operations',
    icon: Copy,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: (events) => calculatePasteStatistics(events).copyCount
  },
  {
    id: 'cutCount',
    label: 'Cut Count',
    category: 'behavior',
    description: 'Number of cut operations',
    icon: Scissors,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: (events) => calculatePasteStatistics(events).cutCount
  },
  {
    id: 'pasteRatio',
    label: 'Paste Ratio',
    category: 'quality',
    description: 'Percentage of content that came from paste operations',
    icon: Clipboard,
    unit: '%',
    formatter: (v) => formatPercentage(v),
    calculator: (events) => calculatePasteStatistics(events).pasteRatio
  },

  // Session Metrics
  {
    id: 'sessionDuration',
    label: 'Session Duration',
    category: 'session',
    description: 'Total time from first to last event',
    icon: Timer,
    unit: '',
    formatter: (v) => formatDuration(v),
    calculator: calculateSessionDuration
  },
  {
    id: 'characterCount',
    label: 'Character Count',
    category: 'session',
    description: 'Total characters in the current text',
    icon: Hash,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: calculateCharacterCount
  },
  {
    id: 'wordCount',
    label: 'Word Count',
    category: 'session',
    description: 'Estimated word count (characters / 5)',
    icon: FileText,
    unit: '',
    formatter: (v) => `${Math.round(v)}`,
    calculator: calculateWordCount
  },
  {
    id: 'textGrowthRate',
    label: 'Text Growth Rate',
    category: 'session',
    description: 'Net characters per minute (typing minus deletions)',
    icon: TrendingUp,
    unit: 'chars/min',
    formatter: (v) => `${formatNumber(v, 1)}/min`,
    calculator: calculateTextGrowthRate
  }
];

// Default metrics shown initially
export const DEFAULT_METRICS = [
  'wpm',
  'avgTimeBetweenKeys',
  'pauseCount',
  'deletionCount',
  'pasteCount',
  'sessionDuration',
  'characterCount',
  'burstCount'
];

// Helper to get metric by ID
export const getMetricById = (id: string): MetricDefinition | undefined => {
  return METRIC_DEFINITIONS.find(m => m.id === id);
};

// Helper to get metrics by category
export const getMetricsByCategory = (category: MetricCategory): MetricDefinition[] => {
  return METRIC_DEFINITIONS.filter(m => m.category === category);
};

// Category labels
export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  speed: 'Speed',
  timing: 'Timing',
  behavior: 'Behavior',
  quality: 'Quality',
  session: 'Session'
};

// Category order for display
export const CATEGORY_ORDER: MetricCategory[] = ['speed', 'timing', 'behavior', 'quality', 'session'];
