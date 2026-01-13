import { Readable } from 'stream';
import { pool } from '../config/database';
import { ProjectModel } from '../models/project.model';
import { Event } from '@humory/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { QueryResult } from 'pg';

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  sessionIds?: string[];
  userIds?: string[];
}

export interface ExportMetadata {
  projectId: string;
  projectName: string;
  exportDate: string;
  filters: ExportFilters;
  totalEvents: number;
}

/**
 * Service for exporting event data in various formats
 */
export class ExportService {
  /**
   * Export events to JSON format with streaming
   */
  static async exportToJSON(
    projectId: string,
    userId: string,
    filters: ExportFilters = {}
  ): Promise<{ stream: Readable; metadata: ExportMetadata }> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);
      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Get project details
      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new AppError(404, 'Project not found');
      }

      // Build query
      const { sql, params } = this.buildExportQuery(projectId, filters);

      // Get total count
      const totalEvents = await this.getEventCount(projectId, filters);

      // Create metadata
      const metadata: ExportMetadata = {
        projectId: project.id,
        projectName: project.name,
        exportDate: new Date().toISOString(),
        filters,
        totalEvents,
      };

      // Create streaming query
      const client = await pool.connect();
      const queryStream = client.query({
        text: sql,
        values: params,
        rowMode: 'array',
      });

      // Create readable stream
      const stream = new Readable({
        objectMode: false,
        read() {},
      });

      // Start with JSON wrapper
      stream.push('{\n');
      stream.push(`  "project": ${JSON.stringify({
        id: project.id,
        name: project.name,
        description: project.description,
      })},\n`);
      stream.push(`  "exportDate": "${metadata.exportDate}",\n`);
      stream.push(`  "filters": ${JSON.stringify(filters)},\n`);
      stream.push(`  "totalEvents": ${totalEvents},\n`);
      stream.push('  "events": [\n');

      let isFirst = true;
      let eventCount = 0;

      queryStream.on('row', (row: any) => {
        const event = this.mapRowToEvent(row);

        if (!isFirst) {
          stream.push(',\n');
        }
        isFirst = false;

        stream.push('    ' + JSON.stringify(event));
        eventCount++;
      });

      queryStream.on('end', () => {
        stream.push('\n  ]\n');
        stream.push('}\n');
        stream.push(null); // Signal end of stream
        client.release();

        logger.info('JSON export completed', {
          projectId,
          userId,
          eventCount,
          filters,
        });
      });

      queryStream.on('error', (error) => {
        logger.error('Error during JSON export streaming', { error, projectId, userId });
        stream.destroy(error);
        client.release();
      });

      return { stream, metadata };
    } catch (error) {
      logger.error('Failed to export to JSON', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Export events to CSV format with streaming
   */
  static async exportToCSV(
    projectId: string,
    userId: string,
    filters: ExportFilters = {}
  ): Promise<{ stream: Readable; metadata: ExportMetadata }> {
    try {
      // Verify project ownership
      const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);
      if (!ownsProject) {
        throw new AppError(403, 'You do not have access to this project');
      }

      // Get project details
      const project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new AppError(404, 'Project not found');
      }

      // Build query
      const { sql, params } = this.buildExportQuery(projectId, filters);

      // Get total count
      const totalEvents = await this.getEventCount(projectId, filters);

      // Create metadata
      const metadata: ExportMetadata = {
        projectId: project.id,
        projectName: project.name,
        exportDate: new Date().toISOString(),
        filters,
        totalEvents,
      };

      // Create streaming query
      const client = await pool.connect();
      const queryStream = client.query({
        text: sql,
        values: params,
        rowMode: 'array',
      });

      // Create readable stream
      const stream = new Readable({
        objectMode: false,
        read() {},
      });

      // Write CSV header
      const headers = [
        'id',
        'session_id',
        'project_id',
        'external_user_id',
        'event_type',
        'timestamp',
        'target_element',
        'key_code',
        'key_char',
        'text_before',
        'text_after',
        'cursor_position',
        'selection_start',
        'selection_end',
        'metadata_json',
      ];
      stream.push(headers.join(',') + '\n');

      let eventCount = 0;

      queryStream.on('row', (row: any) => {
        const csvRow = this.flattenEventToCSV(row);
        stream.push(csvRow + '\n');
        eventCount++;
      });

      queryStream.on('end', () => {
        stream.push(null); // Signal end of stream
        client.release();

        logger.info('CSV export completed', {
          projectId,
          userId,
          eventCount,
          filters,
        });
      });

      queryStream.on('error', (error) => {
        logger.error('Error during CSV export streaming', { error, projectId, userId });
        stream.destroy(error);
        client.release();
      });

      return { stream, metadata };
    } catch (error) {
      logger.error('Failed to export to CSV', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Build SQL query for exporting events with filters
   */
  private static buildExportQuery(
    projectId: string,
    filters: ExportFilters
  ): { sql: string; params: any[] } {
    const conditions: string[] = ['e.project_id = $1'];
    const params: any[] = [projectId];
    let paramCount = 1;

    // Date range filters
    if (filters.startDate) {
      paramCount++;
      conditions.push(`e.timestamp >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      conditions.push(`e.timestamp <= $${paramCount}`);
      params.push(filters.endDate);
    }

    // Session IDs filter
    if (filters.sessionIds && filters.sessionIds.length > 0) {
      paramCount++;
      conditions.push(`e.session_id = ANY($${paramCount})`);
      params.push(filters.sessionIds);
    }

    // User IDs filter (external user IDs)
    if (filters.userIds && filters.userIds.length > 0) {
      paramCount++;
      conditions.push(`s.external_user_id = ANY($${paramCount})`);
      params.push(filters.userIds);
    }

    const whereClause = conditions.join(' AND ');

    // Query with all event fields and external_user_id from sessions
    const sql = `
      SELECT
        e.id,
        e.session_id,
        e.project_id,
        s.external_user_id,
        e.event_type,
        e.timestamp,
        e.target_element,
        e.key_code,
        e.key_char,
        e.text_before,
        e.text_after,
        e.cursor_position,
        e.selection_start,
        e.selection_end,
        e.metadata
      FROM events e
      LEFT JOIN sessions s ON e.session_id = s.id
      WHERE ${whereClause}
      ORDER BY e.timestamp ASC
    `;

    return { sql, params };
  }

  /**
   * Get total event count for export
   */
  private static async getEventCount(
    projectId: string,
    filters: ExportFilters
  ): Promise<number> {
    const conditions: string[] = ['e.project_id = $1'];
    const params: any[] = [projectId];
    let paramCount = 1;

    if (filters.startDate) {
      paramCount++;
      conditions.push(`e.timestamp >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      conditions.push(`e.timestamp <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters.sessionIds && filters.sessionIds.length > 0) {
      paramCount++;
      conditions.push(`e.session_id = ANY($${paramCount})`);
      params.push(filters.sessionIds);
    }

    if (filters.userIds && filters.userIds.length > 0) {
      paramCount++;
      conditions.push(`s.external_user_id = ANY($${paramCount})`);
      params.push(filters.userIds);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT COUNT(*) as count
      FROM events e
      LEFT JOIN sessions s ON e.session_id = s.id
      WHERE ${whereClause}
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Event object
   */
  private static mapRowToEvent(row: any[]): any {
    return {
      id: row[0],
      sessionId: row[1],
      projectId: row[2],
      externalUserId: row[3],
      eventType: row[4],
      timestamp: row[5],
      targetElement: row[6],
      keyCode: row[7],
      keyChar: row[8],
      textBefore: row[9],
      textAfter: row[10],
      cursorPosition: row[11],
      selectionStart: row[12],
      selectionEnd: row[13],
      metadata: row[14],
    };
  }

  /**
   * Flatten event object to CSV row with proper escaping
   */
  private static flattenEventToCSV(row: any[]): string {
    const values = [
      row[0], // id
      row[1], // session_id
      row[2], // project_id
      row[3], // external_user_id
      row[4], // event_type
      row[5], // timestamp
      row[6], // target_element
      row[7], // key_code
      row[8], // key_char
      row[9], // text_before
      row[10], // text_after
      row[11], // cursor_position
      row[12], // selection_start
      row[13], // selection_end
      row[14] ? JSON.stringify(row[14]) : '', // metadata as JSON string
    ];

    // Escape and quote CSV values
    return values
      .map((value) => {
        if (value === null || value === undefined) {
          return '';
        }

        const stringValue = String(value);

        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n') ||
          stringValue.includes('\r')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      })
      .join(',');
  }

  /**
   * Generate filename for export download
   */
  static generateFilename(
    projectId: string,
    format: 'json' | 'csv',
    date: Date = new Date()
  ): string {
    const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `humory-export-${projectId}-${timestamp}.${format}`;
  }
}
