export interface Session {
  id: string;
  projectId: string;
  externalUserId: string;
  sessionStart: Date;
  sessionEnd?: Date | null;
  submitted: boolean;
  submissionTime?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface SessionCreateInput {
  projectId: string;
  externalUserId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface SessionWithStats extends Session {
  eventCount: number;
  duration?: number; // milliseconds
}
