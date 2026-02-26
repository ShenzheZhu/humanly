import { PaperModel } from '../models/paper.model'
import { PaperReviewerModel } from '../models/paper-reviewer.model'
import { PaperStorageService } from './paper-storage.service'
import { pool } from '../config/database'
import { v4 as uuidv4 } from 'uuid'
import {
  Paper,
  InsertPaper,
  UpdatePaper,
  PaperFilter,
  PaperForReviewer,
  InsertPaperAccessLog
} from '@humory/shared'
import { AppError } from '../middleware/error-handler'

export class PaperService {
  // Upload a paper with PDF file
  static async upload(
    file: Buffer,
    metadata: {
      projectId: string
      title: string
      authors: string[]
      abstract: string
      keywords: string[]
      reviewDeadline?: Date
      documentId?: string
    },
    userId: string
  ): Promise<Paper> {
    // Generate unique paper ID for storage
    const paperId = uuidv4()

    // Store PDF file
    const { storagePath, checksum, fileSize } = await PaperStorageService.store(file, paperId)

    // Extract page count (would use pdf-parse library in production)
    const pageCount = null

    // Create paper record
    const paperData: InsertPaper = {
      projectId: metadata.projectId,
      uploadedBy: userId,
      title: metadata.title,
      authors: metadata.authors,
      abstract: metadata.abstract,
      keywords: metadata.keywords,
      pdfStoragePath: storagePath,
      pdfFileSize: fileSize,
      pdfPageCount: pageCount,
      pdfChecksum: checksum,
      reviewDeadline: metadata.reviewDeadline,
      status: 'pending_review'
    }

    const paper = await PaperModel.create(paperData)

    // Link paper to document if documentId provided
    if (metadata.documentId) {
      await pool.query(
        'UPDATE papers SET document_id = $1 WHERE id = $2',
        [metadata.documentId, paper.id]
      )
    }

    return paper
  }

  // Get paper linked to a document
  static async getByDocumentId(documentId: string): Promise<Paper | null> {
    const query = 'SELECT * FROM papers WHERE document_id = $1 LIMIT 1'
    const result = await pool.query(query, [documentId])
    if (result.rows.length === 0) return null
    return PaperModel.mapToCamelCase(result.rows[0])
  }

  // Get paper (with permission check)
  static async get(paperId: string, userId: string): Promise<Paper | PaperForReviewer> {
    // Check if user is admin (uploader or project owner)
    const isAdmin = await this.isAdmin(paperId, userId)

    if (isAdmin) {
      // Return full version with authors
      const paper = await PaperModel.findById(paperId)
      if (!paper) {
        throw new AppError(404, 'Paper not found')
      }
      return paper
    }

    // Check if user is assigned reviewer
    const isReviewer = await PaperReviewerModel.hasAccess(paperId, userId)
    if (!isReviewer) {
      throw new AppError(403, 'Access denied')
    }

    // Return blind version (no authors)
    const paper = await PaperModel.findByIdForReviewer(paperId)
    if (!paper) {
      throw new AppError(404, 'Paper not found')
    }

    return paper
  }

  // List papers for a project (admin only)
  static async listByProject(
    projectId: string,
    userId: string,
    filter?: PaperFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ papers: Paper[]; total: number }> {
    // TODO: Verify user has project access
    // const hasAccess = await ProjectModel.hasAccess(projectId, userId)
    // if (!hasAccess) throw new AppError('No access to project', 403)

    return PaperModel.findByProject(projectId, filter, limit, offset)
  }

  // List papers assigned to reviewer
  static async listByReviewer(
    reviewerId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ papers: PaperForReviewer[]; total: number }> {
    return PaperModel.findByReviewer(reviewerId, status, limit, offset)
  }

  // Stream PDF (with access check and logging)
  static async streamPDF(
    paperId: string,
    userId: string
  ): Promise<NodeJS.ReadableStream> {
    // Verify access (reviewer or admin)
    const hasAccess = await PaperReviewerModel.hasAccess(paperId, userId)
    const isAdmin = await this.isAdmin(paperId, userId)

    if (!hasAccess && !isAdmin) {
      throw new AppError(403, 'Access denied')
    }

    // Get paper
    const paper = await PaperModel.findById(paperId)
    if (!paper) {
      throw new AppError(404, 'Paper not found')
    }

    // Log access (only for reviewers, not admins)
    if (!isAdmin) {
      await this.logAccess({
        paperId,
        reviewerId: userId,
        accessType: 'open'
      })

      // Increment paper opened count
      await PaperReviewerModel.incrementPaperOpenedCount(paperId, userId)
    }

    // Get PDF stream
    return PaperStorageService.getStream(paper.pdfStoragePath)
  }

  // Update paper metadata
  static async update(
    paperId: string,
    data: UpdatePaper,
    userId: string
  ): Promise<Paper> {
    // Verify admin access
    const isAdmin = await this.isAdmin(paperId, userId)
    if (!isAdmin) {
      throw new AppError(403, 'Only admins can update papers')
    }

    return PaperModel.update(paperId, data)
  }

  // Delete paper
  static async delete(paperId: string, userId: string): Promise<void> {
    // Verify admin access
    const isAdmin = await this.isAdmin(paperId, userId)
    if (!isAdmin) {
      throw new AppError(403, 'Only admins can delete papers')
    }

    // Get paper to find storage path
    const paper = await PaperModel.findById(paperId)
    if (!paper) {
      throw new AppError(404, 'Paper not found')
    }

    // Delete from storage
    await PaperStorageService.delete(paper.pdfStoragePath)

    // Delete from database (cascades to reviews, comments, etc.)
    await PaperModel.delete(paperId)
  }

  // Log paper access
  static async logAccess(data: InsertPaperAccessLog): Promise<void> {
    const query = `
      INSERT INTO paper_access_logs (paper_id, reviewer_id, access_type, page_number, duration_seconds)
      VALUES ($1, $2, $3, $4, $5)
    `
    await pool.query(query, [
      data.paperId,
      data.reviewerId,
      data.accessType,
      data.pageNumber || null,
      data.durationSeconds || null
    ])
  }

  // Add reading time
  static async addReadingTime(
    paperId: string,
    reviewerId: string,
    seconds: number
  ): Promise<void> {
    await PaperReviewerModel.addReadingTime(paperId, reviewerId, seconds)
  }

  // Check if user is admin (uploader or project owner)
  private static async isAdmin(paperId: string, userId: string): Promise<boolean> {
    const isUploader = await PaperModel.isUploader(paperId, userId)
    if (isUploader) return true

    const hasProjectAccess = await PaperModel.hasProjectAccess(paperId, userId)
    return hasProjectAccess
  }

  // Extract page count from PDF (would use pdf-parse in production)
  // private static async extractPageCount(pdfBuffer: Buffer): Promise<number> {
  //   const pdf = require('pdf-parse')
  //   const data = await pdf(pdfBuffer)
  //   return data.numpages
  // }
}
