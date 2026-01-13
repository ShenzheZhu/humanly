import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import {
  createProjectSchema,
  updateProjectSchema,
  validate,
} from '@humory/shared';

/**
 * Create a new project
 */
export async function createProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  // Validate request body
  const data = validate(createProjectSchema, req.body);

  const project = await ProjectService.createProject(userId, data);

  res.status(201).json({
    success: true,
    data: project,
    message: 'Project created successfully',
  });
}

/**
 * Get project by ID
 */
export async function getProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.id;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  const project = await ProjectService.getProject(projectId, userId);

  res.json({
    success: true,
    data: project,
  });
}

/**
 * List user's projects
 */
export async function listProjects(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const search = req.query.search as string | undefined;

  const result = await ProjectService.listProjects(
    userId,
    { page, limit },
    search
  );

  res.json({
    success: true,
    data: result.projects,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
}

/**
 * Update project
 */
export async function updateProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.id;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  // Validate request body
  const data = validate(updateProjectSchema, req.body);

  const project = await ProjectService.updateProject(projectId, userId, data);

  res.json({
    success: true,
    data: project,
    message: 'Project updated successfully',
  });
}

/**
 * Delete project
 */
export async function deleteProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.id;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  await ProjectService.deleteProject(projectId, userId);

  res.json({
    success: true,
    message: 'Project deleted successfully',
  });
}

/**
 * Regenerate project token
 */
export async function regenerateToken(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.id;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  const project = await ProjectService.regenerateProjectToken(projectId, userId);

  logger.info('Project token regenerated', { projectId, userId });

  res.json({
    success: true,
    data: project,
    message: 'Project token regenerated successfully',
  });
}

/**
 * Get tracking snippets for a project
 */
export async function getSnippets(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.id;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  const project = await ProjectService.getProject(projectId, userId);

  res.json({
    success: true,
    data: {
      trackingSnippet: project.trackingSnippet,
      iframeSnippet: project.iframeSnippet,
      projectToken: project.projectToken,
    },
  });
}
