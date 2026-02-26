import { pool } from '../config/database'
import {
  PaperReviewer,
  InsertPaperReviewer,
  UpdatePaperReviewer
} from '@humory/shared'
import { AppError } from '../middleware/error-handler'

export class PaperReviewerModel {
  // Assign a reviewer to a paper
  static async create(data: InsertPaperReviewer): Promise<PaperReviewer> {
    const query = `
      INSERT INTO paper_reviewers (
        paper_id, reviewer_id, assigned_by,
        can_view_paper, can_write_review, can_access_ai
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    const values = [
      data.paperId,
      data.reviewerId,
      data.assignedBy,
      data.canViewPaper ?? true,
      data.canWriteReview ?? true,
      data.canAccessAI ?? true
    ]

    try {
      const result = await pool.query(query, values)
      return this.mapToCamelCase(result.rows[0])
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new AppError(409, 'Reviewer already assigned to this paper')
      }
      throw error
    }
  }

  // Find by ID
  static async findById(id: string): Promise<PaperReviewer | null> {
    const query = 'SELECT * FROM paper_reviewers WHERE id = $1'
    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Find by paper and reviewer
  static async findByPaperAndReviewer(
    paperId: string,
    reviewerId: string
  ): Promise<PaperReviewer | null> {
    const query = 'SELECT * FROM paper_reviewers WHERE paper_id = $1 AND reviewer_id = $2'
    const result = await pool.query(query, [paperId, reviewerId])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Get all reviewers for a paper
  static async findByPaper(paperId: string): Promise<PaperReviewer[]> {
    const query = 'SELECT * FROM paper_reviewers WHERE paper_id = $1 ORDER BY assigned_at DESC'
    const result = await pool.query(query, [paperId])

    return result.rows.map(row => this.mapToCamelCase(row))
  }

  // Get all papers for a reviewer
  static async findByReviewer(reviewerId: string): Promise<PaperReviewer[]> {
    const query = 'SELECT * FROM paper_reviewers WHERE reviewer_id = $1 ORDER BY assigned_at DESC'
    const result = await pool.query(query, [reviewerId])

    return result.rows.map(row => this.mapToCamelCase(row))
  }

  // Update reviewer assignment
  static async update(id: string, data: UpdatePaperReviewer): Promise<PaperReviewer> {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.canViewPaper !== undefined) {
      fields.push(`can_view_paper = $${paramIndex}`)
      values.push(data.canViewPaper)
      paramIndex++
    }

    if (data.canWriteReview !== undefined) {
      fields.push(`can_write_review = $${paramIndex}`)
      values.push(data.canWriteReview)
      paramIndex++
    }

    if (data.canAccessAI !== undefined) {
      fields.push(`can_access_ai = $${paramIndex}`)
      values.push(data.canAccessAI)
      paramIndex++
    }

    if (data.reviewStatus !== undefined) {
      fields.push(`review_status = $${paramIndex}`)
      values.push(data.reviewStatus)
      paramIndex++
    }

    if (data.reviewStartedAt !== undefined) {
      fields.push(`review_started_at = $${paramIndex}`)
      values.push(data.reviewStartedAt)
      paramIndex++
    }

    if (data.reviewSubmittedAt !== undefined) {
      fields.push(`review_submitted_at = $${paramIndex}`)
      values.push(data.reviewSubmittedAt)
      paramIndex++
    }

    if (data.totalReadingTimeSeconds !== undefined) {
      fields.push(`total_reading_time_seconds = $${paramIndex}`)
      values.push(data.totalReadingTimeSeconds)
      paramIndex++
    }

    if (data.paperOpenedCount !== undefined) {
      fields.push(`paper_opened_count = $${paramIndex}`)
      values.push(data.paperOpenedCount)
      paramIndex++
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update')
    }

    const query = `
      UPDATE paper_reviewers
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `
    values.push(id)

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      throw new AppError(404, 'Reviewer assignment not found')
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Update by paper and reviewer
  static async updateByPaperAndReviewer(
    paperId: string,
    reviewerId: string,
    data: UpdatePaperReviewer
  ): Promise<PaperReviewer> {
    const assignment = await this.findByPaperAndReviewer(paperId, reviewerId)
    if (!assignment) {
      throw new AppError(404, 'Reviewer assignment not found')
    }

    return this.update(assignment.id, data)
  }

  // Delete reviewer assignment
  static async delete(id: string): Promise<void> {
    const query = 'DELETE FROM paper_reviewers WHERE id = $1'
    const result = await pool.query(query, [id])

    if (result.rowCount === 0) {
      throw new AppError(404, 'Reviewer assignment not found')
    }
  }

  // Delete by paper and reviewer
  static async deleteByPaperAndReviewer(paperId: string, reviewerId: string): Promise<void> {
    const query = 'DELETE FROM paper_reviewers WHERE paper_id = $1 AND reviewer_id = $2'
    const result = await pool.query(query, [paperId, reviewerId])

    if (result.rowCount === 0) {
      throw new AppError(404, 'Reviewer assignment not found')
    }
  }

  // Check if reviewer has access to paper
  static async hasAccess(paperId: string, reviewerId: string): Promise<boolean> {
    const query = `
      SELECT can_view_paper
      FROM paper_reviewers
      WHERE paper_id = $1 AND reviewer_id = $2
    `
    const result = await pool.query(query, [paperId, reviewerId])

    if (result.rows.length === 0) {
      return false
    }

    return result.rows[0].can_view_paper
  }

  // Check if reviewer has access to review
  static async hasAccessToReview(reviewId: string, reviewerId: string): Promise<boolean> {
    const query = `
      SELECT pr.can_view_paper
      FROM paper_reviewers pr
      JOIN reviews r ON r.paper_reviewer_id = pr.id
      WHERE r.id = $1 AND pr.reviewer_id = $2
    `
    const result = await pool.query(query, [reviewId, reviewerId])

    if (result.rows.length === 0) {
      return false
    }

    return result.rows[0].can_view_paper
  }

  // Get permissions for reviewer on paper
  static async getPermissions(
    paperIdOrReviewId: string,
    reviewerId: string
  ): Promise<{ canViewPaper: boolean; canWriteReview: boolean; canAccessAI: boolean } | null> {
    // Try to find by paper ID first
    let query = `
      SELECT can_view_paper, can_write_review, can_access_ai
      FROM paper_reviewers
      WHERE paper_id = $1 AND reviewer_id = $2
    `
    let result = await pool.query(query, [paperIdOrReviewId, reviewerId])

    if (result.rows.length === 0) {
      // Try to find by review ID
      query = `
        SELECT pr.can_view_paper, pr.can_write_review, pr.can_access_ai
        FROM paper_reviewers pr
        JOIN reviews r ON r.paper_reviewer_id = pr.id
        WHERE r.id = $1 AND pr.reviewer_id = $2
      `
      result = await pool.query(query, [paperIdOrReviewId, reviewerId])
    }

    if (result.rows.length === 0) {
      return null
    }

    return {
      canViewPaper: result.rows[0].can_view_paper,
      canWriteReview: result.rows[0].can_write_review,
      canAccessAI: result.rows[0].can_access_ai
    }
  }

  // Increment paper opened count
  static async incrementPaperOpenedCount(paperId: string, reviewerId: string): Promise<void> {
    const query = `
      UPDATE paper_reviewers
      SET paper_opened_count = paper_opened_count + 1
      WHERE paper_id = $1 AND reviewer_id = $2
    `
    await pool.query(query, [paperId, reviewerId])
  }

  // Add reading time
  static async addReadingTime(paperId: string, reviewerId: string, seconds: number): Promise<void> {
    const query = `
      UPDATE paper_reviewers
      SET total_reading_time_seconds = total_reading_time_seconds + $3
      WHERE paper_id = $1 AND reviewer_id = $2
    `
    await pool.query(query, [paperId, reviewerId, seconds])
  }

  // Map database row to camelCase
  private static mapToCamelCase(row: any): PaperReviewer {
    return {
      id: row.id,
      paperId: row.paper_id,
      reviewerId: row.reviewer_id,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      canViewPaper: row.can_view_paper,
      canWriteReview: row.can_write_review,
      canAccessAI: row.can_access_ai,
      reviewStatus: row.review_status,
      reviewStartedAt: row.review_started_at,
      reviewSubmittedAt: row.review_submitted_at,
      totalReadingTimeSeconds: row.total_reading_time_seconds,
      paperOpenedCount: row.paper_opened_count
    }
  }
}
