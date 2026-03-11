import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'stream'
import { AppError } from '../middleware/error-handler'

/**
 * Paper Storage Service
 * Handles local file storage for PDF papers.
 * Storage root: process.env.UPLOAD_DIR (e.g. /app/uploads in production,
 * mounted as a Docker volume so files survive container restarts).
 * Falls back to ./storage/papers relative to the compiled output for local dev.
 *
 * Paths stored in the database are RELATIVE to storageDir so the storage
 * root can be changed (e.g. migrated to GCS) without updating existing rows.
 */
export class PaperStorageService {
  private static storageDir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, 'papers')
    : path.join(__dirname, '../../storage/papers')

  // Initialize storage directory
  static async init(): Promise<void> {
    await fs.ensureDir(this.storageDir)
  }

  /**
   * Resolve a stored path (may be relative or legacy absolute) to an
   * absolute path and verify it lives inside storageDir.
   */
  private static async resolveAndVerify(storedPath: string): Promise<string> {
    const absPath = path.isAbsolute(storedPath)
      ? storedPath
      : path.join(this.storageDir, storedPath)

    const exists = await fs.pathExists(absPath)
    if (!exists) {
      throw new AppError(404, 'Paper file not found')
    }

    const realPath = await fs.realpath(absPath)
    const realStorageDir = await fs.realpath(this.storageDir)

    if (!realPath.startsWith(realStorageDir + path.sep) && realPath !== realStorageDir) {
      throw new AppError(403, 'Invalid file path')
    }

    return realPath
  }

  /**
   * Store a PDF file.
   * Returns a RELATIVE storagePath (e.g. "paperId/checksum.pdf") that should
   * be persisted to the database. Relative paths make storage-root migration easy.
   */
  static async store(file: Buffer, paperId: string): Promise<{
    storagePath: string
    checksum: string
    fileSize: number
  }> {
    // Ensure storage directory exists
    await this.init()

    // Calculate SHA-256 checksum
    const checksum = crypto
      .createHash('sha256')
      .update(file)
      .digest('hex')

    // Create paper-specific directory
    const paperDir = path.join(this.storageDir, paperId)
    await fs.ensureDir(paperDir)

    // Store file
    const filename = `${checksum}.pdf`
    const absPath = path.join(paperDir, filename)
    await fs.writeFile(absPath, file)

    // Return path RELATIVE to storageDir for DB storage
    const relativePath = path.join(paperId, filename)

    return {
      storagePath: relativePath,
      checksum,
      fileSize: file.length
    }
  }

  // Get a readable stream for a paper
  static async getStream(storedPath: string): Promise<Readable> {
    const absPath = await this.resolveAndVerify(storedPath)
    return fs.createReadStream(absPath)
  }

  // Get file buffer (for smaller operations)
  static async getBuffer(storedPath: string): Promise<Buffer> {
    const absPath = await this.resolveAndVerify(storedPath)
    return fs.readFile(absPath)
  }

  // Delete a paper file
  static async delete(storedPath: string): Promise<void> {
    const absPath = path.isAbsolute(storedPath)
      ? storedPath
      : path.join(this.storageDir, storedPath)

    const exists = await fs.pathExists(absPath)
    if (!exists) {
      return // Already deleted
    }

    const realPath = await fs.realpath(absPath)
    const realStorageDir = await fs.realpath(this.storageDir)

    if (!realPath.startsWith(realStorageDir + path.sep) && realPath !== realStorageDir) {
      throw new AppError(403, 'Invalid file path')
    }

    await fs.remove(realPath)

    // Clean up empty paper directory
    const paperDir = path.dirname(realPath)
    const files = await fs.readdir(paperDir)
    if (files.length === 0) {
      await fs.remove(paperDir)
    }
  }

  // Get file size
  static async getFileSize(storedPath: string): Promise<number> {
    const absPath = await this.resolveAndVerify(storedPath)
    const stats = await fs.stat(absPath)
    return stats.size
  }

  // Verify file integrity
  static async verifyChecksum(storagePath: string, expectedChecksum: string): Promise<boolean> {
    const buffer = await this.getBuffer(storagePath)
    const actualChecksum = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex')

    return actualChecksum === expectedChecksum
  }
}
