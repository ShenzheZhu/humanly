import {
  ProjectModel,
  CreateProjectData,
  UpdateProjectData,
  PaginationParams,
  ProjectListResult,
} from '../models/project.model';
import { PaperModel } from '../models/paper.model';
import { DocumentModel } from '../models/document.model';
import { SessionModel } from '../models/session.model';
import { Project, ProjectWithSnippets, BRAND, getTrackerComment, getIframeComment } from '@humanly/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { cacheDelPattern } from '../config/redis';

export class ProjectService {
  private static async invalidateAnalytics(projectId: string): Promise<void> {
    await cacheDelPattern(`analytics:${projectId}:*`);
  }

  /**
   * Create a new project
   */
  static async createProject(
    userId: string,
    data: CreateProjectData
  ): Promise<ProjectWithSnippets> {
    try {
      logger.info('Creating project', { userId, projectName: data.name });

      const project = await ProjectModel.create(userId, data);

      // Generate tracking snippets
      const trackingSnippet = this.generateTrackingSnippet(
        project.projectToken,
        env.corsOrigin
      );
      const iframeSnippet = this.generateIframeSnippet(
        project.projectToken,
        env.corsOrigin
      );

      logger.info('Project created successfully', {
        projectId: project.id,
        userId,
      });

      return {
        ...project,
        trackingSnippet,
        iframeSnippet,
      };
    } catch (error) {
      logger.error('Error creating project', { error, userId });
      throw error;
    }
  }

  /**
   * Get project by ID (verify ownership)
   */
  static async getProject(
    projectId: string,
    userId: string
  ): Promise<ProjectWithSnippets> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (project.userId !== userId) {
      throw new AppError(403, 'Access denied to this project');
    }

    // Generate tracking snippets
    const trackingSnippet = this.generateTrackingSnippet(
      project.projectToken,
      env.corsOrigin
    );
    const iframeSnippet = this.generateIframeSnippet(
      project.projectToken,
      env.corsOrigin
    );

    return {
      ...project,
      trackingSnippet,
      iframeSnippet,
    };
  }

  /**
   * List user's projects with pagination and search
   */
  static async listProjects(
    userId: string,
    pagination: PaginationParams,
    search?: string
  ): Promise<ProjectListResult> {
    try {
      logger.debug('Listing projects', { userId, pagination, search });

      const result = await ProjectModel.findByUserId(userId, pagination, search);

      return result;
    } catch (error) {
      logger.error('Error listing projects', { error, userId });
      throw error;
    }
  }

  /**
   * Join project lookup for user portal invite-code enrollment.
   */
  static async joinProjectByInviteCode(inviteCode: string, userId: string): Promise<Project> {
    const normalizedCode = inviteCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      throw new AppError(400, 'Invite code must be 6 letters or numbers');
    }

    const project = await ProjectModel.findByInviteCode(normalizedCode);

    if (!project) {
      throw new AppError(404, 'Project invite code not found');
    }

    await ProjectModel.enrollUser(project.id, userId);
    await this.invalidateAnalytics(project.id);

    const enrolledProject = await ProjectModel.findById(project.id);
    return enrolledProject || project;
  }

  /**
   * Remove a user portal enrollment from a project.
   */
  static async leaveProject(projectIdOrInviteCode: string, userId: string): Promise<void> {
    const normalizedIdentifier = projectIdOrInviteCode.trim();
    const project = /^[A-Z0-9]{6}$/i.test(normalizedIdentifier)
      ? await ProjectModel.findByInviteCode(normalizedIdentifier.toUpperCase())
      : await ProjectModel.findById(normalizedIdentifier);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    await ProjectModel.unenrollUser(project.id, userId);
    await this.invalidateAnalytics(project.id);
  }

  /**
   * Get the instruction PDF for an enrolled user or project owner.
   */
  static async getInstructionPaper(projectIdOrInviteCode: string, userId: string) {
    const normalizedIdentifier = projectIdOrInviteCode.trim();
    const project = /^[A-Z0-9]{6}$/i.test(normalizedIdentifier)
      ? await ProjectModel.findByInviteCode(normalizedIdentifier.toUpperCase())
      : await ProjectModel.findById(normalizedIdentifier);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const hasAccess = project.userId === userId || await ProjectModel.hasEnrollment(project.id, userId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied to this project');
    }

    return PaperModel.findInstructionByProject(project.id);
  }

  /**
   * Link the current user's enrollment to a submission document.
   */
  static async linkSubmissionDocument(
    projectIdOrInviteCode: string,
    userId: string,
    documentId: string
  ): Promise<void> {
    const normalizedIdentifier = projectIdOrInviteCode.trim();
    const project = /^[A-Z0-9]{6}$/i.test(normalizedIdentifier)
      ? await ProjectModel.findByInviteCode(normalizedIdentifier.toUpperCase())
      : await ProjectModel.findById(normalizedIdentifier);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const isOwner = await DocumentModel.isOwner(documentId, userId);
    if (!isOwner) {
      throw new AppError(404, 'Document not found or unauthorized');
    }

    const linked = await ProjectModel.linkSubmissionDocument(project.id, userId, documentId);
    if (!linked) {
      throw new AppError(404, 'Project enrollment not found');
    }

    await this.invalidateAnalytics(project.id);
  }

  /**
   * Start a real analytics session for a user portal submission document.
   */
  static async startSubmissionSession(
    projectIdOrInviteCode: string,
    userId: string,
    userEmail: string,
    documentId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; projectId: string }> {
    const normalizedIdentifier = projectIdOrInviteCode.trim();
    const project = /^[A-Z0-9]{6}$/i.test(normalizedIdentifier)
      ? await ProjectModel.findByInviteCode(normalizedIdentifier.toUpperCase())
      : await ProjectModel.findById(normalizedIdentifier);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const isOwner = await DocumentModel.isOwner(documentId, userId);
    if (!isOwner) {
      throw new AppError(404, 'Document not found or unauthorized');
    }

    const linked = await ProjectModel.linkSubmissionDocument(project.id, userId, documentId);
    if (!linked) {
      throw new AppError(404, 'Project enrollment not found');
    }

    const session = await SessionModel.create({
      projectId: project.id,
      externalUserId: userEmail,
      ipAddress,
      userAgent,
    });

    await this.invalidateAnalytics(project.id);

    return {
      sessionId: session.id,
      projectId: project.id,
    };
  }

  /**
   * End a real analytics session for a user portal submission document.
   */
  static async endSubmissionSession(
    projectIdOrInviteCode: string,
    userId: string,
    userEmail: string,
    sessionId: string
  ): Promise<void> {
    const normalizedIdentifier = projectIdOrInviteCode.trim();
    const project = /^[A-Z0-9]{6}$/i.test(normalizedIdentifier)
      ? await ProjectModel.findByInviteCode(normalizedIdentifier.toUpperCase())
      : await ProjectModel.findById(normalizedIdentifier);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const session = await SessionModel.findById(sessionId);
    if (!session || session.projectId !== project.id || session.externalUserId !== userEmail) {
      throw new AppError(404, 'Session not found');
    }

    const hasEnrollment = await ProjectModel.hasEnrollment(project.id, userId);
    if (!hasEnrollment) {
      throw new AppError(403, 'Access denied to this project');
    }

    await SessionModel.endSession(sessionId);
    await this.invalidateAnalytics(project.id);
  }

  /**
   * Update project (verify ownership)
   */
  static async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectData
  ): Promise<Project> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (project.userId !== userId) {
      throw new AppError(403, 'Access denied to this project');
    }

    logger.info('Updating project', { projectId, userId });

    const updatedProject = await ProjectModel.update(projectId, data);

    if (!updatedProject) {
      throw new AppError(500, 'Failed to update project');
    }

    logger.info('Project updated successfully', { projectId, userId });

    return updatedProject;
  }

  /**
   * Delete project (verify ownership)
   */
  static async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (project.userId !== userId) {
      throw new AppError(403, 'Access denied to this project');
    }

    logger.info('Deleting project', { projectId, userId });

    await this.invalidateAnalytics(projectId);
    await ProjectModel.delete(projectId);

    logger.info('Project deleted successfully', { projectId, userId });
  }

  /**
   * Regenerate project token (verify ownership)
   */
  static async regenerateProjectToken(
    projectId: string,
    userId: string
  ): Promise<ProjectWithSnippets> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (project.userId !== userId) {
      throw new AppError(403, 'Access denied to this project');
    }

    logger.info('Regenerating project token', { projectId, userId });

    const updatedProject = await ProjectModel.regenerateToken(projectId);

    if (!updatedProject) {
      throw new AppError(500, 'Failed to regenerate token');
    }

    // Generate new tracking snippets with new token
    const trackingSnippet = this.generateTrackingSnippet(
      updatedProject.projectToken,
      env.corsOrigin
    );
    const iframeSnippet = this.generateIframeSnippet(
      updatedProject.projectToken,
      env.corsOrigin
    );

    logger.info('Project token regenerated successfully', { projectId, userId });

    return {
      ...updatedProject,
      trackingSnippet,
      iframeSnippet,
    };
  }

  /**
   * Generate tracking snippet (JavaScript)
   */
  static generateTrackingSnippet(projectToken: string, apiUrl: string): string {
    // Ensure apiUrl doesn't have trailing slash
    const baseUrl = apiUrl.replace(/\/$/, '');

    return `${getTrackerComment()}
<script>
(function() {
  var ${BRAND.tracker.globalVar} = {
    projectToken: '${projectToken}',
    apiUrl: '${baseUrl}',
    sessionId: null,
    eventQueue: [],

    init: function(externalUserId, options) {
      this.externalUserId = externalUserId;
      this.options = options || {};
      this.initSession();
    },

    initSession: function() {
      var self = this;
      fetch(this.apiUrl + '/api/v1/track/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Token': this.projectToken
        },
        body: JSON.stringify({
          externalUserId: this.externalUserId,
          userAgent: navigator.userAgent,
          metadata: this.options.metadata || {}
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        self.sessionId = data.data.sessionId;
        self.attachListeners();
      })
      .catch(function(err) {
        console.error('${BRAND.tracker.consolePrefix} Failed to initialize session', err);
      });
    },

    attachListeners: function() {
      var self = this;
      var targetElements = this.options.targetElements || 'textarea, input[type="text"], [contenteditable="true"]';
      var elements = document.querySelectorAll(targetElements);

      elements.forEach(function(el) {
        ['keydown', 'keyup', 'paste', 'copy', 'cut', 'focus', 'blur', 'input'].forEach(function(eventType) {
          el.addEventListener(eventType, function(e) {
            self.trackEvent(e, el);
          });
        });
      });
    },

    trackEvent: function(event, element) {
      var eventData = {
        eventType: event.type,
        timestamp: new Date().toISOString(),
        targetElement: element.id || element.name || element.tagName,
        keyCode: event.keyCode ? String(event.keyCode) : undefined,
        keyChar: event.key || undefined,
        textBefore: element.value || element.textContent,
        cursorPosition: element.selectionStart || undefined,
        selectionStart: element.selectionStart || undefined,
        selectionEnd: element.selectionEnd || undefined
      };

      this.eventQueue.push(eventData);

      if (this.eventQueue.length >= 10) {
        this.flush();
      }
    },

    flush: function() {
      if (this.eventQueue.length === 0) return;

      var events = this.eventQueue.splice(0, 100);

      fetch(this.apiUrl + '/api/v1/track/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Token': this.projectToken,
          'X-Session-Id': this.sessionId
        },
        body: JSON.stringify({ events: events })
      })
      .catch(function(err) {
        console.error('${BRAND.tracker.consolePrefix} Failed to send events', err);
      });
    }
  };

  window.${BRAND.tracker.namespace} = ${BRAND.tracker.globalVar};

  // Auto-flush on page unload
  window.addEventListener('beforeunload', function() {
    ${BRAND.tracker.globalVar}.flush();
  });
})();
</script>`;
  }

  /**
   * Generate iframe snippet
   */
  static generateIframeSnippet(projectToken: string, apiUrl: string): string {
    // Ensure apiUrl doesn't have trailing slash
    const baseUrl = apiUrl.replace(/\/$/, '');

    return `${getIframeComment()}
<iframe
  src="${baseUrl}/embed/${projectToken}"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none;"
  allow="clipboard-read; clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-forms"
></iframe>

<!-- Initialize tracking for iframe content -->
<script>
  var iframe = document.querySelector('iframe[src*="${baseUrl}"]');

  window.addEventListener('message', function(event) {
    if (event.origin !== '${baseUrl}') return;

    // Handle messages from iframe
    if (event.data.type === '${BRAND.tracker.eventType}') {
      console.log('${BRAND.tracker.consolePrefix} event:', event.data.payload);
    }
  });
</script>`;
  }

  /**
   * Validate project token
   */
  static async validateProjectToken(token: string): Promise<Project | null> {
    try {
      const project = await ProjectModel.findByToken(token);

      if (!project) {
        logger.warn('Invalid project token used', { token: token.substring(0, 8) + '...' });
        return null;
      }

      if (!project.isActive) {
        logger.warn('Inactive project token used', { projectId: project.id });
        return null;
      }

      return project;
    } catch (error) {
      logger.error('Error validating project token', { error });
      return null;
    }
  }
}
