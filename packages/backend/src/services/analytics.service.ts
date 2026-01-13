import { query, queryOne } from '../config/database';
import { ProjectModel } from '../models/project.model';
import { SessionModel } from '../models/session.model';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { cacheGetJSON, cacheSetJSON } from '../config/redis';

const CACHE_TTL = 300; // 5 minutes

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  externalUserId?: string;
  eventType?: string;
}

export interface SummaryStats {
  totalEvents: number;
  totalSessions: number;
  uniqueUsers: number;
  avgEventsPerSession: number;
  avgSessionDuration: number; // in seconds
  completionRate: number; // percentage
}

export interface TimelineDataPoint {
  date: string;
  eventCount: number;
}

export interface EventTypeDistribution {
  eventType: string;
  count: number;
  percentage: number;
}

export interface UserActivity {
  externalUserId: string;
  sessionCount: number;
  eventCount: number;
  lastActive: Date;
}

export interface UserActivityResult {
  users: UserActivity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionDetail {
  id: string;
  projectId: string;
  externalUserId: string;
  sessionStart: Date;
  sessionEnd: Date | null;
  submitted: boolean;
  submissionTime: Date | null;
  durationSeconds: number;
  eventCount: number;
  events: Array<{
    id: string;
    eventType: string;
    timestamp: Date;
    targetElement: string | null;
    keyCode: string | null;
    keyChar: string | null;
    textBefore: string | null;
    textAfter: string | null;
    cursorPosition: number | null;
    selectionStart: number | null;
    selectionEnd: number | null;
    metadata: any;
  }>;
}

export class AnalyticsService {
  /**
   * Generate cache key for analytics queries
   */
  private static getCacheKey(projectId: string, type: string, filters: any): string {
    const filtersStr = JSON.stringify(filters);
    return `analytics:${projectId}:${type}:${filtersStr}`;
  }

  /**
   * Build WHERE clause for filters
   */
  private static buildWhereClause(filters: AnalyticsFilters, paramOffset: number = 1): {
    clause: string;
    params: any[];
    nextIndex: number;
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = paramOffset;

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (filters.externalUserId) {
      conditions.push(`external_user_id = $${paramIndex++}`);
      params.push(filters.externalUserId);
    }

    if (filters.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(filters.eventType);
    }

    const clause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    return { clause, params, nextIndex: paramIndex };
  }

  /**
   * Validate date range in filters
   */
  private static validateFilters(filters: AnalyticsFilters): void {
    if (filters.startDate && filters.endDate) {
      if (filters.startDate > filters.endDate) {
        throw new AppError(400, 'Start date must be before end date');
      }
    }
  }

  /**
   * Get summary statistics for a project
   */
  static async getSummaryStats(
    projectId: string,
    userId: string,
    filters: AnalyticsFilters = {}
  ): Promise<SummaryStats> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);
      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Validate filters
      this.validateFilters(filters);

      // Check cache
      const cacheKey = this.getCacheKey(projectId, 'summary', filters);
      const cached = await cacheGetJSON<SummaryStats>(cacheKey);
      if (cached) {
        logger.debug('Cache hit for summary stats', { projectId, cacheKey });
        return cached;
      }

      logger.debug('Cache miss for summary stats', { projectId, cacheKey });

      const whereClause = this.buildWhereClause(filters, 2);

      // Query using views and continuous aggregates for better performance
      const sql = `
        WITH session_stats AS (
          SELECT
            COUNT(DISTINCT s.id) as total_sessions,
            COUNT(DISTINCT s.external_user_id) as unique_users,
            COUNT(DISTINCT CASE WHEN s.submitted THEN s.id END) as submitted_sessions,
            AVG(EXTRACT(EPOCH FROM (COALESCE(s.session_end, NOW()) - s.session_start))) as avg_duration
          FROM sessions s
          WHERE s.project_id = $1
            ${filters.startDate ? `AND s.session_start >= $${whereClause.params.length > 0 ? 2 : 2}` : ''}
            ${filters.endDate ? `AND s.session_start <= $${whereClause.params.length > 1 ? 3 : (whereClause.params.length > 0 ? 3 : 2)}` : ''}
            ${filters.externalUserId ? `AND s.external_user_id = $${whereClause.nextIndex - 1}` : ''}
        ),
        event_stats AS (
          SELECT
            COUNT(*) as total_events
          FROM events e
          WHERE e.project_id = $1 ${whereClause.clause}
        )
        SELECT
          COALESCE(e.total_events, 0) as "totalEvents",
          COALESCE(s.total_sessions, 0) as "totalSessions",
          COALESCE(s.unique_users, 0) as "uniqueUsers",
          CASE
            WHEN s.total_sessions > 0 THEN ROUND(e.total_events::numeric / s.total_sessions::numeric, 2)
            ELSE 0
          END as "avgEventsPerSession",
          COALESCE(ROUND(s.avg_duration::numeric, 2), 0) as "avgSessionDuration",
          CASE
            WHEN s.total_sessions > 0 THEN ROUND((s.submitted_sessions::numeric / s.total_sessions::numeric) * 100, 2)
            ELSE 0
          END as "completionRate"
        FROM session_stats s
        CROSS JOIN event_stats e
      `;

      const params = [projectId, ...whereClause.params];
      const result = await queryOne<SummaryStats>(sql, params);

      const stats: SummaryStats = {
        totalEvents: parseInt(String(result?.totalEvents || 0)),
        totalSessions: parseInt(String(result?.totalSessions || 0)),
        uniqueUsers: parseInt(String(result?.uniqueUsers || 0)),
        avgEventsPerSession: parseFloat(String(result?.avgEventsPerSession || 0)),
        avgSessionDuration: parseFloat(String(result?.avgSessionDuration || 0)),
        completionRate: parseFloat(String(result?.completionRate || 0)),
      };

      // Cache the result
      await cacheSetJSON(cacheKey, stats, CACHE_TTL);

      logger.info('Summary stats retrieved', { projectId, userId, stats });
      return stats;
    } catch (error) {
      logger.error('Failed to get summary stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get events timeline with grouping
   */
  static async getEventsTimeline(
    projectId: string,
    userId: string,
    groupBy: 'hour' | 'day' | 'week' = 'day',
    filters: AnalyticsFilters = {}
  ): Promise<TimelineDataPoint[]> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);
      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Validate filters
      this.validateFilters(filters);

      // Check cache
      const cacheKey = this.getCacheKey(projectId, `timeline:${groupBy}`, filters);
      const cached = await cacheGetJSON<TimelineDataPoint[]>(cacheKey);
      if (cached) {
        logger.debug('Cache hit for events timeline', { projectId, groupBy, cacheKey });
        return cached;
      }

      logger.debug('Cache miss for events timeline', { projectId, groupBy, cacheKey });

      const whereClause = this.buildWhereClause(filters, 2);

      // Use TimescaleDB continuous aggregate for hourly data when possible
      let sql: string;
      if (groupBy === 'hour' && !filters.eventType && !filters.externalUserId) {
        // Use the events_hourly continuous aggregate for better performance
        sql = `
          SELECT
            TO_CHAR(hour, 'YYYY-MM-DD HH24:00:00') as date,
            SUM(event_count)::integer as "eventCount"
          FROM events_hourly
          WHERE project_id = $1
            ${filters.startDate ? `AND hour >= $2` : ''}
            ${filters.endDate ? `AND hour <= $${filters.startDate ? 3 : 2}` : ''}
          GROUP BY hour
          ORDER BY hour ASC
        `;
      } else {
        // Fallback to direct query on events table
        const bucketInterval = groupBy === 'hour' ? '1 hour' : groupBy === 'day' ? '1 day' : '1 week';
        const dateFormat =
          groupBy === 'hour' ? 'YYYY-MM-DD HH24:00:00' :
          groupBy === 'day' ? 'YYYY-MM-DD' :
          'IYYY-IW'; // ISO year and week

        sql = `
          SELECT
            TO_CHAR(time_bucket('${bucketInterval}', timestamp), '${dateFormat}') as date,
            COUNT(*)::integer as "eventCount"
          FROM events
          WHERE project_id = $1 ${whereClause.clause}
          GROUP BY time_bucket('${bucketInterval}', timestamp)
          ORDER BY time_bucket('${bucketInterval}', timestamp) ASC
        `;
      }

      const params = [projectId, ...whereClause.params];
      const timeline = await query<TimelineDataPoint>(sql, params);

      // Cache the result
      await cacheSetJSON(cacheKey, timeline, CACHE_TTL);

      logger.info('Events timeline retrieved', {
        projectId,
        userId,
        groupBy,
        dataPoints: timeline.length,
      });

      return timeline;
    } catch (error) {
      logger.error('Failed to get events timeline', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
        groupBy,
      });
      throw error;
    }
  }

  /**
   * Get event type distribution
   */
  static async getEventTypeDistribution(
    projectId: string,
    userId: string,
    filters: AnalyticsFilters = {}
  ): Promise<EventTypeDistribution[]> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);
      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Validate filters
      this.validateFilters(filters);

      // Check cache
      const cacheKey = this.getCacheKey(projectId, 'event-types', filters);
      const cached = await cacheGetJSON<EventTypeDistribution[]>(cacheKey);
      if (cached) {
        logger.debug('Cache hit for event type distribution', { projectId, cacheKey });
        return cached;
      }

      logger.debug('Cache miss for event type distribution', { projectId, cacheKey });

      const whereClause = this.buildWhereClause(filters, 2);

      const sql = `
        WITH event_counts AS (
          SELECT
            event_type as "eventType",
            COUNT(*)::integer as count
          FROM events
          WHERE project_id = $1 ${whereClause.clause}
          GROUP BY event_type
        ),
        total_events AS (
          SELECT SUM(count)::integer as total FROM event_counts
        )
        SELECT
          ec."eventType",
          ec.count,
          ROUND((ec.count::numeric / NULLIF(te.total, 0)::numeric) * 100, 2) as percentage
        FROM event_counts ec
        CROSS JOIN total_events te
        ORDER BY ec.count DESC
      `;

      const params = [projectId, ...whereClause.params];
      const distribution = await query<EventTypeDistribution>(sql, params);

      // Ensure percentage is a number
      const formattedDistribution = distribution.map(d => ({
        ...d,
        percentage: parseFloat(String(d.percentage || 0)),
      }));

      // Cache the result
      await cacheSetJSON(cacheKey, formattedDistribution, CACHE_TTL);

      logger.info('Event type distribution retrieved', {
        projectId,
        userId,
        eventTypes: formattedDistribution.length,
      });

      return formattedDistribution;
    } catch (error) {
      logger.error('Failed to get event type distribution', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get user activity list with pagination
   */
  static async getUserActivity(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: AnalyticsFilters = {}
  ): Promise<UserActivityResult> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);
      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Validate filters and pagination
      this.validateFilters(filters);
      if (page < 1) page = 1;
      if (limit < 1) limit = 20;
      if (limit > 100) limit = 100;

      const offset = (page - 1) * limit;

      // Check cache
      const cacheKey = this.getCacheKey(projectId, `users:${page}:${limit}`, filters);
      const cached = await cacheGetJSON<UserActivityResult>(cacheKey);
      if (cached) {
        logger.debug('Cache hit for user activity', { projectId, page, limit, cacheKey });
        return cached;
      }

      logger.debug('Cache miss for user activity', { projectId, page, limit, cacheKey });

      // Build date filter for sessions
      const dateFilters: string[] = [];
      const dateParams: any[] = [];
      let dateParamIndex = 2;

      if (filters.startDate) {
        dateFilters.push(`s.session_start >= $${dateParamIndex++}`);
        dateParams.push(filters.startDate);
      }
      if (filters.endDate) {
        dateFilters.push(`s.session_start <= $${dateParamIndex++}`);
        dateParams.push(filters.endDate);
      }

      const dateClause = dateFilters.length > 0 ? `AND ${dateFilters.join(' AND ')}` : '';

      // Query user activity
      const sql = `
        WITH user_stats AS (
          SELECT
            s.external_user_id as "externalUserId",
            COUNT(DISTINCT s.id) as "sessionCount",
            COUNT(e.id) as "eventCount",
            MAX(s.session_start) as "lastActive"
          FROM sessions s
          LEFT JOIN events e ON e.session_id = s.id
          WHERE s.project_id = $1 ${dateClause}
          GROUP BY s.external_user_id
        )
        SELECT
          "externalUserId",
          "sessionCount"::integer,
          "eventCount"::integer,
          "lastActive"
        FROM user_stats
        ORDER BY "lastActive" DESC
        LIMIT $${dateParamIndex} OFFSET $${dateParamIndex + 1}
      `;

      const params = [projectId, ...dateParams, limit, offset];
      const users = await query<UserActivity>(sql, params);

      // Get total count
      const countSql = `
        SELECT COUNT(DISTINCT external_user_id)::integer as count
        FROM sessions
        WHERE project_id = $1 ${dateClause}
      `;
      const countResult = await queryOne<{ count: number }>(countSql, [projectId, ...dateParams]);
      const total = countResult?.count || 0;

      const result: UserActivityResult = {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // Cache the result
      await cacheSetJSON(cacheKey, result, CACHE_TTL);

      logger.info('User activity retrieved', {
        projectId,
        userId,
        page,
        limit,
        total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get user activity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
        page,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get detailed session information with events
   */
  static async getSessionDetails(
    sessionId: string,
    userId: string
  ): Promise<SessionDetail> {
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

      // Check cache
      const cacheKey = `analytics:session:${sessionId}`;
      const cached = await cacheGetJSON<SessionDetail>(cacheKey);
      if (cached) {
        logger.debug('Cache hit for session details', { sessionId, cacheKey });
        return cached;
      }

      logger.debug('Cache miss for session details', { sessionId, cacheKey });

      // Get events for the session
      const eventsSql = `
        SELECT
          id,
          event_type as "eventType",
          timestamp,
          target_element as "targetElement",
          key_code as "keyCode",
          key_char as "keyChar",
          text_before as "textBefore",
          text_after as "textAfter",
          cursor_position as "cursorPosition",
          selection_start as "selectionStart",
          selection_end as "selectionEnd",
          metadata
        FROM events
        WHERE session_id = $1
        ORDER BY timestamp ASC
      `;

      const events = await query(eventsSql, [sessionId]);

      // Calculate duration
      const durationSeconds = session.sessionEnd
        ? Math.round(
            (new Date(session.sessionEnd).getTime() - new Date(session.sessionStart).getTime()) / 1000
          )
        : Math.round(
            (Date.now() - new Date(session.sessionStart).getTime()) / 1000
          );

      const details: SessionDetail = {
        id: session.id,
        projectId: session.projectId,
        externalUserId: session.externalUserId,
        sessionStart: new Date(session.sessionStart),
        sessionEnd: session.sessionEnd ? new Date(session.sessionEnd) : null,
        submitted: session.submitted,
        submissionTime: session.submissionTime ? new Date(session.submissionTime) : null,
        durationSeconds,
        eventCount: events.length,
        events,
      };

      // Cache the result (shorter TTL since sessions can be updated)
      await cacheSetJSON(cacheKey, details, 60); // 1 minute TTL

      logger.info('Session details retrieved', {
        sessionId,
        userId,
        projectId: session.projectId,
        eventCount: events.length,
      });

      return details;
    } catch (error) {
      logger.error('Failed to get session details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get list of sessions for a project
   */
  static async getProjectSessions(
    projectId: string,
    userId: string,
    filters: any
  ): Promise<any[]> {
    try {
      // Verify user owns the project
      const project = await ProjectModel.findById(projectId);
      if (!project || project.userId !== userId) {
        throw new AppError(404, 'Project not found');
      }

      // Get sessions with stats
      const sessions = await SessionModel.findByProjectId(projectId, filters);

      logger.info('Sessions list retrieved', {
        projectId,
        userId,
        count: sessions.length,
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to get sessions list', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get total count of sessions for a project
   */
  static async getSessionsCount(
    projectId: string,
    userId: string,
    filters: any
  ): Promise<number> {
    try {
      // Verify user owns the project
      const project = await ProjectModel.findById(projectId);
      if (!project || project.userId !== userId) {
        throw new AppError(404, 'Project not found');
      }

      // Get count
      const count = await SessionModel.countByProjectId(projectId, filters);

      return count;
    } catch (error) {
      logger.error('Failed to get sessions count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }
}
