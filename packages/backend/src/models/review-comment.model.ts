import { pool } from '../config/database'
import {
  ReviewComment,
  InsertReviewComment,
  UpdateReviewComment,
  ReviewCommentFilter
} from '@humory/shared'
import { AppError } from '../middleware/error-handler'

export class ReviewCommentModel {
  // Create a new comment
  static async create(data: InsertReviewComment): Promise<ReviewComment> {
    const query = `
      INSERT INTO review_comments (
        review_id, reviewer_id, paper_id, page_number,
        position_x, position_y, selected_text, comment_text, comment_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const values = [
      data.reviewId,
      data.reviewerId,
      data.paperId,
      data.pageNumber,
      data.positionX || null,
      data.positionY || null,
      data.selectedText || null,
      data.commentText,
      data.commentType || null
    ]

    const result = await pool.query(query, values)
    return this.mapToCamelCase(result.rows[0])
  }

  // Find comment by ID
  static async findById(commentId: string): Promise<ReviewComment | null> {
    const query = 'SELECT * FROM review_comments WHERE id = $1'
    const result = await pool.query(query, [commentId])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Find comments with filters
  static async find(
    filter: ReviewCommentFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ comments: ReviewComment[]; total: number }> {
    let query = 'SELECT * FROM review_comments WHERE 1=1'
    const values: any[] = []
    let paramIndex = 1

    if (filter.reviewId) {
      query += ` AND review_id = $${paramIndex}`
      values.push(filter.reviewId)
      paramIndex++
    }

    if (filter.paperId) {
      query += ` AND paper_id = $${paramIndex}`
      values.push(filter.paperId)
      paramIndex++
    }

    if (filter.pageNumber !== undefined) {
      query += ` AND page_number = $${paramIndex}`
      values.push(filter.pageNumber)
      paramIndex++
    }

    if (filter.isResolved !== undefined) {
      query += ` AND is_resolved = $${paramIndex}`
      values.push(filter.isResolved)
      paramIndex++
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)')
    const countResult = await pool.query(countQuery, values)
    const total = parseInt(countResult.rows[0].count)

    // Add sorting and pagination
    query += ` ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    values.push(limit, offset)

    const result = await pool.query(query, values)
    const comments = result.rows.map(row => this.mapToCamelCase(row))

    return { comments, total }
  }

  // Get comments for a review
  static async findByReview(reviewId: string): Promise<ReviewComment[]> {
    const query = 'SELECT * FROM review_comments WHERE review_id = $1 ORDER BY page_number, created_at ASC'
    const result = await pool.query(query, [reviewId])

    return result.rows.map(row => this.mapToCamelCase(row))
  }

  // Get comments for a paper (all reviewers)
  static async findByPaper(paperId: string, pageNumber?: number): Promise<ReviewComment[]> {
    let query = 'SELECT * FROM review_comments WHERE paper_id = $1'
    const values: any[] = [paperId]

    if (pageNumber !== undefined) {
      query += ' AND page_number = $2'
      values.push(pageNumber)
    }

    query += ' ORDER BY page_number, created_at ASC'

    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapToCamelCase(row))
  }

  // Update comment
  static async update(commentId: string, data: UpdateReviewComment): Promise<ReviewComment> {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.commentText !== undefined) {
      fields.push(`comment_text = $${paramIndex}`)
      values.push(data.commentText)
      paramIndex++
    }

    if (data.commentType !== undefined) {
      fields.push(`comment_type = $${paramIndex}`)
      values.push(data.commentType)
      paramIndex++
    }

    if (data.isResolved !== undefined) {
      fields.push(`is_resolved = $${paramIndex}`)
      values.push(data.isResolved)
      paramIndex++
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update')
    }

    const query = `
      UPDATE review_comments
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `
    values.push(commentId)

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      throw new AppError(404, 'Comment not found')
    }

    return this.mapToCamelCase(result.rows[0])
  }

  // Delete comment
  static async delete(commentId: string): Promise<void> {
    const query = 'DELETE FROM review_comments WHERE id = $1'
    const result = await pool.query(query, [commentId])

    if (result.rowCount === 0) {
      throw new AppError(404, 'Comment not found')
    }
  }

  // Check if user is the comment owner
  static async isOwner(commentId: string, reviewerId: string): Promise<boolean> {
    const query = 'SELECT reviewer_id FROM review_comments WHERE id = $1'
    const result = await pool.query(query, [commentId])

    if (result.rows.length === 0) {
      return false
    }

    return result.rows[0].reviewer_id === reviewerId
  }

  // Get comment count for a review
  static async getCount(reviewId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM review_comments WHERE review_id = $1'
    const result = await pool.query(query, [reviewId])

    return parseInt(result.rows[0].count)
  }

  // Map database row to camelCase
  private static mapToCamelCase(row: any): ReviewComment {
    return {
      id: row.id,
      reviewId: row.review_id,
      reviewerId: row.reviewer_id,
      paperId: row.paper_id,
      pageNumber: row.page_number,
      positionX: row.position_x,
      positionY: row.position_y,
      selectedText: row.selected_text,
      commentText: row.comment_text,
      commentType: row.comment_type,
      isResolved: row.is_resolved,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
