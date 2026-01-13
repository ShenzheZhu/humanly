import { query, queryOne } from '../config/database';
import { Project } from '@humory/shared';
import { generateProjectToken } from '../utils/crypto';

export interface CreateProjectData {
  userId: string;
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
                created_at as "createdAt", updated_at as "updatedAt"
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
      SELECT id, user_id as "userId", name, description, project_token as "projectToken",
             user_id_key as "userIdKey", external_service_type as "externalServiceType",
             external_service_url as "externalServiceUrl", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM projects
      WHERE id = $1
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
      SELECT id, user_id as "userId", name, description, project_token as "projectToken",
             user_id_key as "userIdKey", external_service_type as "externalServiceType",
             external_service_url as "externalServiceUrl", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM projects
      WHERE user_id = $1 ${searchCondition}
      ORDER BY created_at DESC
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
      SELECT id, user_id as "userId", name, description, project_token as "projectToken",
             user_id_key as "userIdKey", external_service_type as "externalServiceType",
             external_service_url as "externalServiceUrl", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM projects
      WHERE project_token = $1 AND is_active = TRUE
    `;
    return queryOne<Project>(sql, [projectToken]);
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
      RETURNING id, user_id as "userId", name, description, project_token as "projectToken",
                user_id_key as "userIdKey", external_service_type as "externalServiceType",
                external_service_url as "externalServiceUrl", is_active as "isActive",
                created_at as "createdAt", updated_at as "updatedAt"
    `;

    return queryOne<Project>(sql, values);
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
      RETURNING id, user_id as "userId", name, description, project_token as "projectToken",
                user_id_key as "userIdKey", external_service_type as "externalServiceType",
                external_service_url as "externalServiceUrl", is_active as "isActive",
                created_at as "createdAt", updated_at as "updatedAt"
    `;

    return queryOne<Project>(sql, [newToken, id]);
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
