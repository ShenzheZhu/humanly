import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import {
  createProjectSchema,
  updateProjectSchema,
  validate,
} from '@humanly/shared';

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
 * Look up a project by invite code for user enrollment
 */
export async function joinProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { inviteCode } = req.body;

  if (!inviteCode || typeof inviteCode !== 'string') {
    throw new AppError(400, 'Invite code is required');
  }

  const project = await ProjectService.joinProjectByInviteCode(inviteCode, userId);

  res.json({
    success: true,
    data: {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        enrolledUserCount: project.enrolledUserCount ?? 0,
        inviteCode: project.projectToken.slice(0, 6).toUpperCase(),
      },
    },
  });
}

/**
 * Remove current user's enrollment from a project
 */
export async function leaveProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.projectId;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  await ProjectService.leaveProject(projectId, userId);

  res.json({
    success: true,
    message: 'Project enrollment removed successfully',
  });
}

/**
 * Get the current user's accessible project instruction PDF metadata
 */
export async function getInstructionPaper(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.projectId;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  const paper = await ProjectService.getInstructionPaper(projectId, userId);

  res.json({
    success: true,
    data: {
      paper,
    },
  });
}

/**
 * Link current user's project enrollment to a submission document
 */
export async function linkSubmissionDocument(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = req.params.projectId;
  const { documentId } = req.body;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  if (!documentId || typeof documentId !== 'string') {
    throw new AppError(400, 'Document ID is required');
  }

  await ProjectService.linkSubmissionDocument(projectId, userId, documentId);

  res.json({
    success: true,
    message: 'Project submission document linked successfully',
  });
}

/**
 * Start a real analytics session for the current user's project submission document
 */
export async function startSubmissionSession(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const userEmail = req.user!.email;
  const projectId = req.params.projectId;
  const { documentId } = req.body;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  if (!documentId || typeof documentId !== 'string') {
    throw new AppError(400, 'Document ID is required');
  }

  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  const session = await ProjectService.startSubmissionSession(
    projectId,
    userId,
    userEmail,
    documentId,
    ipAddress,
    userAgent
  );

  res.status(201).json({
    success: true,
    data: session,
    message: 'Submission session started successfully',
  });
}

/**
 * End a real analytics session for the current user's project submission document
 */
export async function endSubmissionSession(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const userEmail = req.user!.email;
  const projectId = req.params.projectId;
  const sessionId = req.params.sessionId;

  if (!projectId) {
    throw new AppError(400, 'Project ID is required');
  }

  if (!sessionId) {
    throw new AppError(400, 'Session ID is required');
  }

  await ProjectService.endSubmissionSession(projectId, userId, userEmail, sessionId);

  res.json({
    success: true,
    message: 'Submission session ended successfully',
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
