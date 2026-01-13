import { DocumentModel } from '../models/document.model';
import { DocumentEventModel } from '../models/document-event.model';
import {
  Document,
  DocumentInsertData,
  DocumentUpdateData,
  DocumentFilters,
  DocumentStatistics,
  DocumentEvent,
  DocumentEventInsertData,
  DocumentEventQueryFilters,
  PaginatedResult,
} from '@humory/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export class DocumentService {
  /**
   * Create a new document
   */
  static async createDocument(
    userId: string,
    title: string,
    content: Record<string, any> = {},
    initialStatus: 'draft' | 'published' | 'archived' = 'draft'
  ): Promise<Document> {
    try {
      logger.info('Creating document', { userId, title });

      const plainText = this.extractPlainText(content);
      const wordCount = this.calculateWordCount(plainText);
      const characterCount = this.calculateCharacterCount(plainText);

      const data: DocumentInsertData = {
        userId,
        title,
        content,
        plainText,
        status: initialStatus,
        wordCount,
        characterCount,
      };

      const document = await DocumentModel.create(data);

      logger.info('Document created successfully', {
        documentId: document.id,
        userId,
      });

      return document;
    } catch (error) {
      logger.error('Error creating document', { error, userId });
      throw error;
    }
  }

  /**
   * Get document by ID with ownership verification
   */
  static async getDocument(documentId: string, userId: string): Promise<Document> {
    try {
      const document = await DocumentModel.findByIdAndUserId(documentId, userId);

      if (!document) {
        throw new AppError(404, 'Document not found');
      }

      return document;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching document', { error, documentId, userId });
      throw error;
    }
  }

  /**
   * Update document
   */
  static async updateDocument(
    documentId: string,
    userId: string,
    updates: DocumentUpdateData
  ): Promise<Document> {
    try {
      logger.info('Updating document', { documentId, userId });

      // If content is updated, recalculate plainText, wordCount, and characterCount
      if (updates.content !== undefined) {
        updates.plainText = this.extractPlainText(updates.content);
        updates.wordCount = this.calculateWordCount(updates.plainText);
        updates.characterCount = this.calculateCharacterCount(updates.plainText);
      }

      const document = await DocumentModel.update(documentId, userId, updates);

      if (!document) {
        throw new AppError(404, 'Document not found or unauthorized');
      }

      logger.info('Document updated successfully', { documentId, userId });

      return document;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating document', { error, documentId, userId });
      throw error;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      logger.info('Deleting document', { documentId, userId });

      const deleted = await DocumentModel.delete(documentId, userId);

      if (!deleted) {
        throw new AppError(404, 'Document not found or unauthorized');
      }

      logger.info('Document deleted successfully', { documentId, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting document', { error, documentId, userId });
      throw error;
    }
  }

  /**
   * List documents with filters and pagination
   */
  static async listDocuments(
    userId: string,
    filters: DocumentFilters
  ): Promise<PaginatedResult<Document>> {
    try {
      const result = await DocumentModel.findByUserId(userId, filters);
      return result;
    } catch (error) {
      logger.error('Error listing documents', { error, userId });
      throw error;
    }
  }

  /**
   * Track events for a document
   */
  static async trackEvents(
    documentId: string,
    userId: string,
    events: DocumentEventInsertData[]
  ): Promise<void> {
    try {
      // Verify document ownership
      const isOwner = await DocumentModel.isOwner(documentId, userId);
      if (!isOwner) {
        throw new AppError(404, 'Document not found or unauthorized');
      }

      // Ensure all events have correct documentId and userId
      const validatedEvents = events.map((event) => ({
        ...event,
        documentId,
        userId,
      }));

      await DocumentEventModel.batchInsert(validatedEvents);

      logger.info('Document events tracked', {
        documentId,
        userId,
        eventCount: events.length,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error tracking document events', {
        error,
        documentId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get document events with total count
   */
  static async getDocumentEvents(
    documentId: string,
    userId: string,
    filters: DocumentEventQueryFilters = {}
  ): Promise<{ events: DocumentEvent[]; total: number }> {
    try {
      // Verify document ownership
      const isOwner = await DocumentModel.isOwner(documentId, userId);
      if (!isOwner) {
        throw new AppError(404, 'Document not found or unauthorized');
      }

      // Get both events and total count in parallel
      const [events, total] = await Promise.all([
        DocumentEventModel.findByDocumentId(documentId, filters),
        DocumentEventModel.countByDocumentIdWithFilters(documentId, filters),
      ]);

      return { events, total };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching document events', {
        error,
        documentId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStatistics(
    documentId: string,
    userId: string
  ): Promise<DocumentStatistics> {
    try {
      const stats = await DocumentModel.getStatistics(documentId, userId);

      if (!stats) {
        throw new AppError(404, 'Document not found or unauthorized');
      }

      return stats;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching document statistics', {
        error,
        documentId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Extract plain text from Lexical editor state
   * This is a simplified extraction - in production, use Lexical's built-in methods
   */
  static extractPlainText(lexicalState: Record<string, any>): string {
    try {
      if (!lexicalState || typeof lexicalState !== 'object') {
        return '';
      }

      // Lexical stores content in root.children
      const root = lexicalState.root;
      if (!root || !root.children) {
        return '';
      }

      // Recursively extract text from nodes
      const extractTextFromNode = (node: any): string => {
        if (!node) return '';

        // If node has text property, return it
        if (typeof node.text === 'string') {
          return node.text;
        }

        // If node has children, recursively extract from them
        if (Array.isArray(node.children)) {
          return node.children.map(extractTextFromNode).join('');
        }

        return '';
      };

      const text = root.children.map(extractTextFromNode).join('\n');
      return text.trim();
    } catch (error) {
      logger.warn('Error extracting plain text from Lexical state', { error });
      return '';
    }
  }

  /**
   * Calculate word count from plain text
   */
  static calculateWordCount(text: string): number {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    // Remove extra whitespace and split by whitespace
    const words = text
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter((word) => word.length > 0);

    return words.length;
  }

  /**
   * Calculate character count from plain text (excluding whitespace)
   */
  static calculateCharacterCount(text: string): number {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    // Count all characters including spaces
    return text.length;
  }

  /**
   * Verify document ownership (helper method)
   */
  static async verifyOwnership(documentId: string, userId: string): Promise<void> {
    const isOwner = await DocumentModel.isOwner(documentId, userId);
    if (!isOwner) {
      throw new AppError('Document not found or unauthorized', 404);
    }
  }
}
