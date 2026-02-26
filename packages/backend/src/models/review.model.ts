import { pool } from '../config/database'
import {
  Review,
  InsertReview,
  UpdateReview,
  ReviewFilter,
  AnonymousReview
} from '@humory/shared'
import { AppError } from '../middleware/error-handler'

export class ReviewModel {
  // Create a new review
  static async create(data: InsertReview): Promise<Review> {
    const query = `
      INSERT INTO reviews (
        paper_id, reviewer_id, paper_reviewer_id, content
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const values = [
      data.paperId,
      data.reviewerId,
      data.paperReviewerId,
      data.content || {}
    ]

    const result = await pool.query(query, values)
    return this.mapToCamelCase(result.rows[0])
  }

  // Find review by ID
  static async findById(reviewId: string): Promise<Review | null> {
    const query = 'SELECT * FROM reviews WHERE id = $1'
    const result = await pool.query(query, [reviewId])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Find review by paper and reviewer
  static async findByPaperAndReviewer(
    paperId: string,
    reviewerId: string
  ): Promise<Review | null> {
    const query = 'SELECT * FROM reviews WHERE paper_id = $1 AND reviewer_id = $2'
    const result = await pool.query(query, [paperId, reviewerId])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Get all reviews for a paper (anonymous)
  static async findByPaper(paperId: string): Promise<AnonymousReview[]> {
    const query = `
      SELECT
        r.id, r.paper_id, r.plain_text, r.word_count, r.status,
        r.scores, r.recommendation, r.confidence_level,
        r.submitted_at, r.created_at
      FROM reviews r
      WHERE r.paper_id = $1
      ORDER BY r.created_at ASC
    `
    const result = await pool.query(query, [paperId])

    return result.rows.map((row, index) => ({
      id: row.id,
      paperId: row.paper_id,
      reviewerAlias: `Reviewer ${index + 1}`, // Anonymous
      plainText: row.plain_text || '',
      wordCount: row.word_count || 0,
      status: row.status,
      scores: row.scores,
      recommendation: row.recommendation,
      confidenceLevel: row.confidence_level,
      submittedAt: row.submitted_at,
      createdAt: row.created_at
    }))
  }

  // Get reviews by reviewer
  static async findByReviewer(
    reviewerId: string,
    filter?: ReviewFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ reviews: Review[]; total: number }> {
    let query = 'SELECT * FROM reviews WHERE reviewer_id = $1'
    const values: any[] = [reviewerId]
    let paramIndex = 2

    if (filter?.paperId) {
      query += ` AND paper_id = $${paramIndex}`
      values.push(filter.paperId)
      paramIndex++
    }

    if (filter?.status) {
      query += ` AND status = $${paramIndex}`
      values.push(filter.status)
      paramIndex++
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)')
    const countResult = await pool.query(countQuery, values)
    const total = parseInt(countResult.rows[0].count)

    // Add sorting and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    const result = await pool.query(query, values)
    const reviews = result.rows.map(row => this.mapToCamelCase(row))

    return { reviews, total }
  }

  // Update review
  static async update(reviewId: string, data: UpdateReview): Promise<Review> {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex}`)
      values.push(data.content)
      paramIndex++
    }

    if (data.plainText !== undefined) {
      fields.push(`plain_text = $${paramIndex}`)
      values.push(data.plainText)
      paramIndex++
    }

    if (data.wordCount !== undefined) {
      fields.push(`word_count = $${paramIndex}`)
      values.push(data.wordCount)
      paramIndex++
    }

    if (data.characterCount !== undefined) {
      fields.push(`character_count = $${paramIndex}`)
      values.push(data.characterCount)
      paramIndex++
    }

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex}`)
      values.push(data.status)
      paramIndex++
    }

    if (data.scores !== undefined) {
      fields.push(`scores = $${paramIndex}`)
      values.push(data.scores)
      paramIndex++
    }

    if (data.recommendation !== undefined) {
      fields.push(`recommendation = $${paramIndex}`)
      values.push(data.recommendation)
      paramIndex++
    }

    if (data.confidenceLevel !== undefined) {
      fields.push(`confidence_level = $${paramIndex}`)
      values.push(data.confidenceLevel)
      paramIndex++
    }

    if (data.submittedAt !== undefined) {
      fields.push(`submitted_at = $${paramIndex}`)
      values.push(data.submittedAt)
      paramIndex++
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update')
    }

    const query = `
      UPDATE reviews
      SET ${fields.join(', ')}, version = version + 1
      WHERE id = $${paramIndex}
      RETURNING *
    `
    values.push(reviewId)

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      throw new AppError(404, 'Review not found')
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Delete review
  static async delete(reviewId: string): Promise<void> {
    const query = 'DELETE FROM reviews WHERE id = $1'
    const result = await pool.query(query, [reviewId])

    if (result.rowCount === 0) {
      throw new AppError(404, 'Review not found')
    }
  }

  // Check if user is the review owner
  static async isOwner(reviewId: string, reviewerId: string): Promise<boolean> {
    const query = 'SELECT reviewer_id FROM reviews WHERE id = $1'
    const result = await pool.query(query, [reviewId])

    if (result.rows.length === 0) {
      return false
    }

    return result.rows[0].reviewer_id === reviewerId
  }

  // Get review count by status for a paper
  static async getCountByPaper(paperId: string): Promise<{
    total: number
    draft: number
    submitted: number
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted
      FROM reviews
      WHERE paper_id = $1
    `
    const result = await pool.query(query, [paperId])

    return {
      total: parseInt(result.rows[0].total),
      draft: parseInt(result.rows[0].draft),
      submitted: parseInt(result.rows[0].submitted)
    }
  }

  // Map database row to camelCase
  private static mapToCamelCase(row: any): Review {
    return {
      id: row.id,
      paperId: row.paper_id,
      reviewerId: row.reviewer_id,
      paperReviewerId: row.paper_reviewer_id,
      content: row.content,
      plainText: row.plain_text,
      wordCount: row.word_count,
      characterCount: row.character_count,
      status: row.status,
      version: row.version,
      scores: row.scores,
      recommendation: row.recommendation,
      confidenceLevel: row.confidence_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      submittedAt: row.submitted_at
    }
  }
}
