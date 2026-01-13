import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  regenerateToken,
  getSnippets,
} from '../controllers/project.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/projects
 * List user's projects with pagination and search
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (optional, searches name and description)
 */
router.get('/', asyncHandler(listProjects));

/**
 * POST /api/v1/projects
 * Create a new project
 * Body: { name, description?, userIdKey?, externalServiceType?, externalServiceUrl? }
 */
router.post('/', asyncHandler(createProject));

/**
 * GET /api/v1/projects/:id
 * Get project details by ID
 */
router.get('/:id', asyncHandler(getProject));

/**
 * PUT /api/v1/projects/:id
 * Update project
 * Body: { name?, description?, userIdKey?, externalServiceType?, externalServiceUrl?, isActive? }
 */
router.put('/:id', asyncHandler(updateProject));

/**
 * DELETE /api/v1/projects/:id
 * Delete project
 */
router.delete('/:id', asyncHandler(deleteProject));

/**
 * POST /api/v1/projects/:id/regenerate-token
 * Regenerate project token
 */
router.post('/:id/regenerate-token', asyncHandler(regenerateToken));

/**
 * GET /api/v1/projects/:id/snippet
 * Get tracking snippets (JavaScript and iframe)
 */
router.get('/:id/snippet', asyncHandler(getSnippets));

export default router;
