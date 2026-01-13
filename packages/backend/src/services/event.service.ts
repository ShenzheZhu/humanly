import { SessionModel } from '../models/session.model';
import { EventModel, EventInsertData } from '../models/event.model';
import { ProjectModel } from '../models/project.model';
import { Session, TrackerEvent, Event, EventQueryFilters } from '@humory/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export interface InitSessionInput {
  projectToken: string;
  externalUserId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface InitSessionResponse {
  sessionId: string;
  projectId: string;
  message: string;
}

export interface IngestEventsInput {
  projectId: string;
  sessionId: string;
  events: TrackerEvent[];
}

export interface IngestEventsResponse {
  success: boolean;
  eventsIngested: number;
  message: string;
}

export interface SubmitSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export class EventService {
  /**
   * Initialize a new tracking session
   */
  static async initSession(input: InitSessionInput): Promise<InitSessionResponse> {
    const startTime = Date.now();

    try {
      // Verify project token
      const project = await ProjectModel.findByToken(input.projectToken);

      if (!project) {
        throw new AppError(401, 'Invalid or inactive project token');
      }

      if (!project.isActive) {
        throw new AppError(403, 'Project is not active');
      }

      // Create new session
      const session = await SessionModel.create({
        projectId: project.id,
        externalUserId: input.externalUserId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      const duration = Date.now() - startTime;

      logger.info('Session initialized', {
        sessionId: session.id,
        projectId: project.id,
        externalUserId: input.externalUserId,
        duration,
      });

      // Broadcast session creation via WebSocket if available
      if ((global as any).io) {
        (global as any).io.to(`project:${project.id}`).emit('session-started', {
          sessionId: session.id,
          externalUserId: session.externalUserId,
          timestamp: new Date(),
        });
      }

      return {
        sessionId: session.id,
        projectId: project.id,
        message: 'Session initialized successfully',
      };
    } catch (error) {
      logger.error('Failed to initialize session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        externalUserId: input.externalUserId,
      });
      throw error;
    }
  }

  /**
   * Ingest batch of events for a session
   */
  static async ingestEvents(input: IngestEventsInput): Promise<IngestEventsResponse> {
    const startTime = Date.now();

    try {
      if (!input.events || input.events.length === 0) {
        throw new AppError(400, 'No events provided');
      }

      if (input.events.length > 1000) {
        throw new AppError(400, 'Too many events. Maximum 1000 events per batch.');
      }

      // Verify session exists
      const session = await SessionModel.findById(input.sessionId);

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      // Verify session belongs to project
      if (session.projectId !== input.projectId) {
        throw new AppError(403, 'Session does not belong to this project');
      }

      // Check if session has ended
      if (session.sessionEnd) {
        throw new AppError(400, 'Cannot add events to an ended session');
      }

      // Prepare events for insertion
      const eventsToInsert: EventInsertData[] = input.events.map((event) => ({
        sessionId: input.sessionId,
        projectId: input.projectId,
        eventType: event.eventType,
        timestamp: typeof event.timestamp === 'string' ? new Date(event.timestamp) : event.timestamp,
        targetElement: event.targetElement,
        keyCode: event.keyCode,
        keyChar: event.keyChar,
        textBefore: event.textBefore,
        textAfter: event.textAfter,
        cursorPosition: event.cursorPosition,
        selectionStart: event.selectionStart,
        selectionEnd: event.selectionEnd,
        metadata: event.metadata,
      }));

      // Batch insert events
      await EventModel.batchInsert(eventsToInsert);

      const duration = Date.now() - startTime;

      logger.info('Events ingested', {
        sessionId: input.sessionId,
        projectId: input.projectId,
        eventCount: input.events.length,
        duration,
      });

      // Broadcast events via WebSocket if available
      // Send each event individually for live preview
      if ((global as any).io) {
        // Get session to include externalUserId
        const sessionForEvent = await SessionModel.findById(input.sessionId);

        if (sessionForEvent) {
          // Emit the first few events individually for live preview
          const eventsToEmit = input.events.slice(0, 10);
          eventsToEmit.forEach((event) => {
            (global as any).io.to(`project:${input.projectId}`).emit('event-received', {
              sessionId: input.sessionId,
              externalUserId: sessionForEvent.externalUserId,
              event,
            });
          });
        }
      }

      return {
        success: true,
        eventsIngested: input.events.length,
        message: 'Events ingested successfully',
      };
    } catch (error) {
      logger.error('Failed to ingest events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: input.sessionId,
        projectId: input.projectId,
        eventCount: input.events?.length || 0,
      });
      throw error;
    }
  }

  /**
   * Submit session (mark as completed)
   */
  static async submitSession(sessionId: string, projectId?: string): Promise<SubmitSessionResponse> {
    const startTime = Date.now();

    try {
      // Verify session exists
      const session = await SessionModel.findById(sessionId);

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      // Verify project ownership if projectId provided
      if (projectId && session.projectId !== projectId) {
        throw new AppError(403, 'Session does not belong to this project');
      }

      // Check if already submitted
      if (session.submitted) {
        throw new AppError(400, 'Session already submitted');
      }

      // Mark session as submitted and end it
      await SessionModel.markSubmitted(sessionId);
      await SessionModel.endSession(sessionId);

      const duration = Date.now() - startTime;

      logger.info('Session submitted', {
        sessionId,
        projectId: session.projectId,
        externalUserId: session.externalUserId,
        duration,
      });

      // Broadcast session submission via WebSocket if available
      if ((global as any).io) {
        (global as any).io.to(`project:${session.projectId}`).emit('session-ended', {
          sessionId,
          externalUserId: session.externalUserId,
          submitted: true,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        sessionId,
        message: 'Session submitted successfully',
      };
    } catch (error) {
      logger.error('Failed to submit session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Get events for a session (with project ownership verification)
   */
  static async getSessionEvents(
    sessionId: string,
    userId: string,
    limit: number = 1000,
    offset: number = 0
  ): Promise<{ events: Event; session: Session; total: number }> {
    try {
      // Get session
      const session = await SessionModel.findById(sessionId);

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(session.projectId, userId);

      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this session');
      }

      // Get events
      const events = await EventModel.findBySessionId(sessionId, limit, offset);
      const total = await EventModel.countBySessionId(sessionId);

      logger.info('Session events retrieved', {
        sessionId,
        projectId: session.projectId,
        userId,
        eventCount: events.length,
        total,
      });

      return {
        events: events as any,
        session,
        total,
      };
    } catch (error) {
      logger.error('Failed to get session events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Query events with filters (with project ownership verification)
   */
  static async queryEvents(
    projectId: string,
    userId: string,
    filters: EventQueryFilters = {}
  ): Promise<{ events: Event[]; total: number }> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);

      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Query events
      const events = await EventModel.findByProjectId(projectId, filters);
      const total = await EventModel.countByProjectId(projectId, filters);

      logger.info('Events queried', {
        projectId,
        userId,
        eventCount: events.length,
        total,
        filters,
      });

      return {
        events,
        total,
      };
    } catch (error) {
      logger.error('Failed to query events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get event statistics for a project
   */
  static async getEventStats(projectId: string, userId: string) {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);

      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Get event type distribution
      const eventTypes = await EventModel.getEventTypes(projectId);

      // Get total event count
      const totalEvents = await EventModel.countByProjectId(projectId);

      logger.info('Event statistics retrieved', {
        projectId,
        userId,
        totalEvents,
      });

      return {
        totalEvents,
        eventTypes,
      };
    } catch (error) {
      logger.error('Failed to get event statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }
}
