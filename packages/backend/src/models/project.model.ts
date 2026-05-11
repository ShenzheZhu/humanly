import { query, queryOne } from '../config/database';
import { Project } from '@humanly/shared';
import { generateProjectToken } from '../utils/crypto';

export interface CreateProjectData {
  name: string;
  description?: string;
  userIdKey?: string;
  externalServiceType?: string;
  externalServiceUrl?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  userIdKey?: string;
  externalServiceType?: string;
  externalServiceUrl?: string;
  isActive?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ProjectListResult {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProjectModel {
  private static readonly projectSelect = `
    p.id, p.user_id as "userId", p.name, p.description, p.project_token as "projectToken",
    p.user_id_key as "userIdKey", p.external_service_type as "externalServiceType",
    p.external_service_url as "externalServiceUrl", p.is_active as "isActive",
    COALESCE(pe.enrolled_user_count, 0)::int as "enrolledUserCount",
    p.created_at as "createdAt", p.updated_at as "updatedAt"
  `;

  private static readonly enrollmentCountJoin = `
    LEFT JOIN (
      SELECT project_id, COUNT(*)::int as enrolled_user_count
      FROM project_enrollments
      GROUP BY project_id
    ) pe ON pe.project_id = p.id
  `;

  /**
   * Create a new project with a unique token
   */
  static async create(userId: string, data: CreateProjectData): Promise<Project> {
    const projectToken = generateProjectToken();
    const userIdKey = data.userIdKey || 'userId';

    const sql = `
      INSERT INTO projects (
        user_id, name, description, project_token, user_id_key,
        external_service_type, external_service_url, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id, user_id as "userId", name, description, project_token as "projectToken",
                user_id_key as "userIdKey", external_service_type as "externalServiceType",
                external_service_url as "externalServiceUrl", is_active as "isActive",
                0 as "enrolledUserCount", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const project = await queryOne<Project>(sql, [
      userId,
      data.name,
      data.description || null,
      projectToken,
      userIdKey,
      data.externalServiceType || null,
      data.externalServiceUrl || null,
    ]);

    if (!project) throw new Error('Failed to create project');
    return project;
  }

  /**
   * Find project by ID
   */
  static async findById(id: string): Promise<Project | null> {
    const sql = `
      SELECT ${this.projectSelect}
      FROM projects p
      ${this.enrollmentCountJoin}
      WHERE p.id = $1
    `;
    return queryOne<Project>(sql, [id]);
  }

  /**
   * Find projects by user ID with pagination
   */
  static async findByUserId(
    userId: string,
    pagination: PaginationParams,
    search?: string
  ): Promise<ProjectListResult> {
    const offset = (pagination.page - 1) * pagination.limit;

    // Build search condition
    let searchCondition = '';
    const params: any[] = [userId, pagination.limit, offset];

    if (search) {
      searchCondition = 'AND (name ILIKE $4 OR description ILIKE $4)';
      params.push(`%${search}%`);
    }

    // Get projects
    const projectsSql = `
      SELECT ${this.projectSelect}
      FROM projects p
      ${this.enrollmentCountJoin}
      WHERE p.user_id = $1 ${searchCondition}
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const projects = await query<Project>(projectsSql, params);

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count
      FROM projects
      WHERE user_id = $1 ${searchCondition}
    `;
    const countParams = search ? [userId, `%${search}%`] : [userId];
    const countResult = await queryOne<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult?.count || '0', 10);

    return {
      projects,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Find project by project token (for tracking)
   */
  static async findByToken(projectToken: string): Promise<Project | null> {
    const sql = `
      SELECT ${this.projectSelect}
      FROM projects p
      ${this.enrollmentCountJoin}
      WHERE p.project_token = $1 AND p.is_active = TRUE
    `;
    return queryOne<Project>(sql, [projectToken]);
  }

  /**
   * Find active project by short invite code.
   * The invite code is the first 6 characters of the project token.
   */
  static async findByInviteCode(inviteCode: string): Promise<Project | null> {
    const sql = `
      SELECT ${this.projectSelect}
      FROM projects p
      ${this.enrollmentCountJoin}
      WHERE UPPER(SUBSTRING(p.project_token FROM 1 FOR 6)) = $1
        AND p.is_active = TRUE
      ORDER BY p.created_at DESC
      LIMIT 1
    `;
    return queryOne<Project>(sql, [inviteCode.toUpperCase()]);
  }

  /**
   * Persist an invite-code enrollment. Repeated joins by the same user are idempotent.
   */
  static async enrollUser(projectId: string, userId: string): Promise<void> {
    const sql = `
      INSERT INTO project_enrollments (project_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (project_id, user_id) DO NOTHING
    `;

    await query(sql, [projectId, userId]);
  }

  /**
   * Remove a user's invite-code enrollment from a project.
   */
  static async unenrollUser(projectId: string, userId: string): Promise<boolean> {
    const sql = `
      DELETE FROM project_enrollments
      WHERE project_id = $1 AND user_id = $2
      RETURNING id
    `;

    const deletedEnrollment = await queryOne<{ id: string }>(sql, [projectId, userId]);
    return !!deletedEnrollment;
  }

  /**
   * Check if a user is enrolled in a project.
   */
  static async hasEnrollment(projectId: string, userId: string): Promise<boolean> {
    const sql = 'SELECT 1 FROM project_enrollments WHERE project_id = $1 AND user_id = $2';
    const result = await queryOne(sql, [projectId, userId]);
    return !!result;
  }

  /**
   * Link an enrollment to the user's project submission document.
   */
  static async linkSubmissionDocument(projectId: string, userId: string, documentId: string): Promise<boolean> {
    const sql = `
      UPDATE project_enrollments
      SET submission_document_id = $3
      WHERE project_id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await queryOne<{ id: string }>(sql, [projectId, userId, documentId]);
    return !!result;
  }

  /**
   * Update project
   */
  static async update(id: string, data: UpdateProjectData): Promise<Project | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.userIdKey !== undefined) {
      updates.push(`user_id_key = $${paramIndex++}`);
      values.push(data.userIdKey);
    }

    if (data.externalServiceType !== undefined) {
      updates.push(`external_service_type = $${paramIndex++}`);
      values.push(data.externalServiceType);
    }

    if (data.externalServiceUrl !== undefined) {
      updates.push(`external_service_url = $${paramIndex++}`);
      values.push(data.externalServiceUrl);
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id
    `;

    const updatedProject = await queryOne<{ id: string }>(sql, values);
    return updatedProject ? this.findById(updatedProject.id) : null;
  }

  /**
   * Delete project
   */
  static async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM projects WHERE id = $1';
    await query(sql, [id]);
  }

  /**
   * Regenerate project token
   */
  static async regenerateToken(id: string): Promise<Project | null> {
    const newToken = generateProjectToken();

    const sql = `
      UPDATE projects
      SET project_token = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `;

    const updatedProject = await queryOne<{ id: string }>(sql, [newToken, id]);
    return updatedProject ? this.findById(updatedProject.id) : null;
  }

  /**
   * Check if project token exists
   */
  static async tokenExists(token: string): Promise<boolean> {
    const sql = 'SELECT 1 FROM projects WHERE project_token = $1';
    const result = await queryOne(sql, [token]);
    return !!result;
  }

  /**
   * Verify that a user owns a project
   */
  static async verifyOwnership(projectId: string, userId: string): Promise<boolean> {
    const sql = 'SELECT 1 FROM projects WHERE id = $1 AND user_id = $2';
    const result = await queryOne(sql, [projectId, userId]);
    return !!result;
  }
}
