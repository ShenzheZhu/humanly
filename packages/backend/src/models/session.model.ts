import { query, queryOne } from '../config/database';
import { Session, SessionWithStats } from '@humory/shared';

export interface CreateSessionData {
  projectId: string;
  externalUserId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionFilters {
  externalUserId?: string;
  startDate?: Date;
  endDate?: Date;
  submitted?: boolean;
  limit?: number;
  offset?: number;
}

export class SessionModel {
  /**
   * Create a new session
   */
  static async create(data: CreateSessionData): Promise<Session> {
    const sql = `
      INSERT INTO sessions (
        project_id,
        external_user_id,
        session_start,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, NOW(), $3, $4)
      RETURNING
        id,
        project_id as "projectId",
        external_user_id as "externalUserId",
        session_start as "sessionStart",
        session_end as "sessionEnd",
        submitted,
        submission_time as "submissionTime",
        ip_address as "ipAddress",
        user_agent as "userAgent",
        created_at as "createdAt"
    `;

    const session = await queryOne<Session>(sql, [
      data.projectId,
      data.externalUserId,
      data.ipAddress || null,
      data.userAgent || null,
    ]);

    if (!session) {
      throw new Error('Failed to create session');
    }

    return session;
  }

  /**
   * Find session by ID
   */
  static async findById(sessionId: string): Promise<Session | null> {
    const sql = `
      SELECT
        id,
        project_id as "projectId",
        external_user_id as "externalUserId",
        session_start as "sessionStart",
        session_end as "sessionEnd",
        submitted,
        submission_time as "submissionTime",
        ip_address as "ipAddress",
        user_agent as "userAgent",
        created_at as "createdAt"
      FROM sessions
      WHERE id = $1
    `;

    return queryOne<Session>(sql, [sessionId]);
  }

  /**
   * Find sessions by project ID with optional filters
   */
  static async findByProjectId(
    projectId: string,
    filters: SessionFilters = {}
  ): Promise<SessionWithStats[]> {
    const conditions: string[] = ['s.project_id = $1'];
    const params: any[] = [projectId];
    let paramCount = 1;

    // Add filters
    if (filters.externalUserId) {
      paramCount++;
      conditions.push(`s.external_user_id = $${paramCount}`);
      params.push(filters.externalUserId);
    }

    if (filters.startDate) {
      paramCount++;
      conditions.push(`s.session_start >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      conditions.push(`s.session_start <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters.submitted !== undefined) {
      paramCount++;
      conditions.push(`s.submitted = $${paramCount}`);
      params.push(filters.submitted);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        s.id,
        s.project_id as "projectId",
        s.external_user_id as "externalUserId",
        s.session_start as "sessionStart",
        s.session_end as "sessionEnd",
        s.submitted,
        s.submission_time as "submissionTime",
        s.ip_address as "ipAddress",
        s.user_agent as "userAgent",
        s.created_at as "createdAt",
        COUNT(e.id) as "eventCount",
        EXTRACT(EPOCH FROM (COALESCE(s.session_end, NOW()) - s.session_start)) * 1000 as duration
      FROM sessions s
      LEFT JOIN events e ON s.id = e.session_id
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY s.session_start DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(filters.limit || 50);
    params.push(filters.offset || 0);

    const results = await query<any>(sql, params);

    return results.map((row) => ({
      ...row,
      eventCount: parseInt(row.eventCount, 10),
      duration: row.duration ? parseFloat(row.duration) : undefined,
    }));
  }

  /**
   * Update session data
   */
  static async update(sessionId: string, data: Partial<Session>): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (data.sessionEnd !== undefined) {
      paramCount++;
      updates.push(`session_end = $${paramCount}`);
      params.push(data.sessionEnd);
    }

    if (data.submitted !== undefined) {
      paramCount++;
      updates.push(`submitted = $${paramCount}`);
      params.push(data.submitted);
    }

    if (data.submissionTime !== undefined) {
      paramCount++;
      updates.push(`submission_time = $${paramCount}`);
      params.push(data.submissionTime);
    }

    if (updates.length === 0) {
      return;
    }

    paramCount++;
    const sql = `
      UPDATE sessions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `;

    params.push(sessionId);

    await query(sql, params);
  }

  /**
   * Mark session as submitted
   */
  static async markSubmitted(sessionId: string): Promise<void> {
    const sql = `
      UPDATE sessions
      SET submitted = TRUE,
          submission_time = NOW()
      WHERE id = $1
    `;

    await query(sql, [sessionId]);
  }

  /**
   * End session by setting session_end timestamp
   */
  static async endSession(sessionId: string): Promise<void> {
    const sql = `
      UPDATE sessions
      SET session_end = NOW()
      WHERE id = $1 AND session_end IS NULL
    `;

    await query(sql, [sessionId]);
  }

  /**
   * Count sessions by project ID with optional filters
   */
  static async countByProjectId(
    projectId: string,
    filters: SessionFilters = {}
  ): Promise<number> {
    const conditions: string[] = ['project_id = $1'];
    const params: any[] = [projectId];
    let paramCount = 1;

    if (filters.externalUserId) {
      paramCount++;
      conditions.push(`external_user_id = $${paramCount}`);
      params.push(filters.externalUserId);
    }

    if (filters.startDate) {
      paramCount++;
      conditions.push(`session_start >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      conditions.push(`session_start <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters.submitted !== undefined) {
      paramCount++;
      conditions.push(`submitted = $${paramCount}`);
      params.push(filters.submitted);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `SELECT COUNT(*) as count FROM sessions WHERE ${whereClause}`;

    const result = await queryOne<{ count: string }>(sql, params);
    return result ? parseInt(result.count, 10) : 0;
  }
}
