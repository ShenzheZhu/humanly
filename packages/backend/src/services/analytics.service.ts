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
  totalUsers: number;
  avgEventsPerSession: number;
  avgSessionDuration: number; // in seconds
  completionRate: number; // percentage
  activeUsers24h: number;
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
  avgDuration: number;
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

      const sql = `
        WITH tracker_sessions AS (
          SELECT
            s.id::text as session_id,
            s.external_user_id,
            s.session_start,
            EXTRACT(EPOCH FROM (COALESCE(s.session_end, NOW()) - s.session_start)) as duration_seconds,
            s.submitted
          FROM sessions s
          WHERE s.project_id = $1
            AND ($2::timestamptz IS NULL OR s.session_start >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR s.session_start <= $3::timestamptz)
            AND ($4::text IS NULL OR s.external_user_id = $4::text)
        ),
        document_event_rows AS (
          SELECT
            de.document_id,
            u.email as external_user_id,
            de.timestamp,
            de.event_type
          FROM project_enrollments pe
          JOIN document_events de ON de.document_id = pe.submission_document_id
          JOIN users u ON u.id = de.user_id
          WHERE pe.project_id = $1
            AND ($2::timestamptz IS NULL OR de.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR de.timestamp <= $3::timestamptz)
            AND ($4::text IS NULL OR u.email = $4::text)
            AND ($5::text IS NULL OR de.event_type = $5::text)
        ),
        document_sessions AS (
          SELECT
            document_id::text as session_id,
            external_user_id,
            MIN(timestamp) as session_start,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as duration_seconds,
            FALSE as submitted
          FROM document_event_rows
          GROUP BY document_id, external_user_id
        ),
        all_sessions AS (
          SELECT * FROM tracker_sessions
          UNION ALL
          SELECT * FROM document_sessions
        ),
        tracker_event_stats AS (
          SELECT
            COUNT(*) as total_events
          FROM events e
          JOIN sessions s ON s.id = e.session_id
          WHERE e.project_id = $1
            AND ($2::timestamptz IS NULL OR e.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR e.timestamp <= $3::timestamptz)
            AND ($4::text IS NULL OR s.external_user_id = $4::text)
            AND ($5::text IS NULL OR e.event_type = $5::text)
        ),
        document_event_stats AS (
          SELECT COUNT(*) as total_events FROM document_event_rows
        ),
        session_stats AS (
          SELECT
            COUNT(*) as total_sessions,
            COUNT(DISTINCT external_user_id) as unique_users,
            COUNT(CASE WHEN submitted THEN 1 END) as submitted_sessions,
            AVG(duration_seconds) as avg_duration,
            COUNT(DISTINCT CASE
              WHEN session_start >= NOW() - INTERVAL '24 hours' THEN external_user_id
            END) as active_users_24h
          FROM all_sessions
        )
        SELECT
          COALESCE(te.total_events, 0) + COALESCE(de.total_events, 0) as "totalEvents",
          COALESCE(s.total_sessions, 0) as "totalSessions",
          COALESCE(s.unique_users, 0) as "uniqueUsers",
          COALESCE(s.unique_users, 0) as "totalUsers",
          CASE
            WHEN s.total_sessions > 0 THEN ROUND(((COALESCE(te.total_events, 0) + COALESCE(de.total_events, 0))::numeric / s.total_sessions::numeric), 2)
            ELSE 0
          END as "avgEventsPerSession",
          COALESCE(ROUND(s.avg_duration::numeric, 2), 0) as "avgSessionDuration",
          CASE
            WHEN s.total_sessions > 0 THEN ROUND((s.submitted_sessions::numeric / s.total_sessions::numeric) * 100, 2)
            ELSE 0
          END as "completionRate",
          COALESCE(s.active_users_24h, 0) as "activeUsers24h"
        FROM session_stats s
        CROSS JOIN tracker_event_stats te
        CROSS JOIN document_event_stats de
      `;

      const params = [
        projectId,
        filters.startDate || null,
        filters.endDate || null,
        filters.externalUserId || null,
        filters.eventType || null,
      ];
      const result = await queryOne<SummaryStats>(sql, params);

      const stats: SummaryStats = {
        totalEvents: parseInt(String(result?.totalEvents || 0)),
        totalSessions: parseInt(String(result?.totalSessions || 0)),
        uniqueUsers: parseInt(String(result?.uniqueUsers || 0)),
        totalUsers: parseInt(String(result?.totalUsers || result?.uniqueUsers || 0)),
        avgEventsPerSession: parseFloat(String(result?.avgEventsPerSession || 0)),
        avgSessionDuration: parseFloat(String(result?.avgSessionDuration || 0)),
        completionRate: parseFloat(String(result?.completionRate || 0)),
        activeUsers24h: parseInt(String(result?.activeUsers24h || 0), 10),
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

      const bucketInterval = groupBy === 'hour' ? '1 hour' : groupBy === 'day' ? '1 day' : '1 week';
      const dateFormat =
        groupBy === 'hour' ? 'YYYY-MM-DD HH24:00:00' :
        groupBy === 'day' ? 'YYYY-MM-DD' :
        'IYYY-IW';

      const sql = `
        WITH all_events AS (
          SELECT e.timestamp
          FROM events e
          JOIN sessions s ON s.id = e.session_id
          WHERE e.project_id = $1
            AND ($2::timestamptz IS NULL OR e.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR e.timestamp <= $3::timestamptz)
            AND ($4::text IS NULL OR s.external_user_id = $4::text)
            AND ($5::text IS NULL OR e.event_type = $5::text)
          UNION ALL
          SELECT de.timestamp
          FROM project_enrollments pe
          JOIN document_events de ON de.document_id = pe.submission_document_id
          JOIN users u ON u.id = de.user_id
          WHERE pe.project_id = $1
            AND ($2::timestamptz IS NULL OR de.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR de.timestamp <= $3::timestamptz)
            AND ($4::text IS NULL OR u.email = $4::text)
            AND ($5::text IS NULL OR de.event_type = $5::text)
        )
        SELECT
          TO_CHAR(time_bucket('${bucketInterval}', timestamp), '${dateFormat}') as date,
          COUNT(*)::integer as "eventCount"
        FROM all_events
        GROUP BY time_bucket('${bucketInterval}', timestamp)
        ORDER BY time_bucket('${bucketInterval}', timestamp) ASC
      `;

      const params = [
        projectId,
        filters.startDate || null,
        filters.endDate || null,
        filters.externalUserId || null,
        filters.eventType || null,
      ];
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

      const sql = `
        WITH all_events AS (
          SELECT e.event_type
          FROM events e
          JOIN sessions s ON s.id = e.session_id
          WHERE e.project_id = $1
            AND ($2::timestamptz IS NULL OR e.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR e.timestamp <= $3::timestamptz)
            AND ($4::text IS NULL OR s.external_user_id = $4::text)
            AND ($5::text IS NULL OR e.event_type = $5::text)
          UNION ALL
          SELECT de.event_type
          FROM project_enrollments pe
          JOIN document_events de ON de.document_id = pe.submission_document_id
          JOIN users u ON u.id = de.user_id
          WHERE pe.project_id = $1
            AND ($2::timestamptz IS NULL OR de.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR de.timestamp <= $3::timestamptz)
            AND ($4::text IS NULL OR u.email = $4::text)
            AND ($5::text IS NULL OR de.event_type = $5::text)
        ),
        event_counts AS (
          SELECT
            event_type as "eventType",
            COUNT(*)::integer as count
          FROM all_events
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

      const params = [
        projectId,
        filters.startDate || null,
        filters.endDate || null,
        filters.externalUserId || null,
        filters.eventType || null,
      ];
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

      // Query user activity
      const sql = `
        WITH tracker_session_stats AS (
          SELECT
            s.external_user_id as "externalUserId",
            COUNT(DISTINCT s.id) as "sessionCount",
            COUNT(e.id) as "eventCount",
            MAX(s.session_start) as "lastActive",
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(s.session_end, NOW()) - s.session_start)))::numeric, 2), 0) as "avgDuration"
          FROM sessions s
          LEFT JOIN events e ON e.session_id = s.id
          WHERE s.project_id = $1
            AND ($2::timestamptz IS NULL OR s.session_start >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR s.session_start <= $3::timestamptz)
          GROUP BY s.external_user_id
        ),
        document_sessions AS (
          SELECT
            u.email as "externalUserId",
            de.document_id,
            COUNT(de.id)::integer as event_count,
            MIN(de.timestamp) as first_event,
            MAX(de.timestamp) as last_event,
            EXTRACT(EPOCH FROM (MAX(de.timestamp) - MIN(de.timestamp))) as duration_seconds
          FROM project_enrollments pe
          JOIN document_events de ON de.document_id = pe.submission_document_id
          JOIN users u ON u.id = de.user_id
          WHERE pe.project_id = $1
            AND ($2::timestamptz IS NULL OR de.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR de.timestamp <= $3::timestamptz)
          GROUP BY u.email, de.document_id
        ),
        document_user_stats AS (
          SELECT
            "externalUserId",
            COUNT(document_id)::integer as "sessionCount",
            SUM(event_count)::integer as "eventCount",
            MAX(last_event) as "lastActive",
            COALESCE(ROUND(AVG(duration_seconds)::numeric, 2), 0) as "avgDuration"
          FROM document_sessions
          GROUP BY "externalUserId"
        ),
        combined_stats AS (
          SELECT * FROM tracker_session_stats
          UNION ALL
          SELECT * FROM document_user_stats
        ),
        user_stats AS (
          SELECT
            "externalUserId",
            SUM("sessionCount")::integer as "sessionCount",
            SUM("eventCount")::integer as "eventCount",
            MAX("lastActive") as "lastActive",
            COALESCE(ROUND(AVG("avgDuration")::numeric, 2), 0) as "avgDuration"
          FROM combined_stats
          GROUP BY "externalUserId"
        )
        SELECT
          "externalUserId",
          "sessionCount"::integer,
          "eventCount"::integer,
          "lastActive",
          "avgDuration"::float
        FROM user_stats
        ORDER BY "lastActive" DESC
        LIMIT $4 OFFSET $5
      `;

      const params = [projectId, filters.startDate || null, filters.endDate || null, limit, offset];
      const users = await query<UserActivity>(sql, params);

      // Get total count
      const countSql = `
        WITH active_users AS (
          SELECT s.external_user_id
          FROM sessions s
          WHERE s.project_id = $1
            AND ($2::timestamptz IS NULL OR s.session_start >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR s.session_start <= $3::timestamptz)
          UNION
          SELECT u.email as external_user_id
          FROM project_enrollments pe
          JOIN document_events de ON de.document_id = pe.submission_document_id
          JOIN users u ON u.id = de.user_id
          WHERE pe.project_id = $1
            AND ($2::timestamptz IS NULL OR de.timestamp >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR de.timestamp <= $3::timestamptz)
        )
        SELECT COUNT(DISTINCT external_user_id)::integer as count
        FROM active_users
      `;
      const countResult = await queryOne<{ count: number }>(countSql, [
        projectId,
        filters.startDate || null,
        filters.endDate || null,
      ]);
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
