import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'stream'
import { AppError } from '../middleware/error-handler'

/**
 * Paper Storage Service
 * Handles local file storage for PDF papers
 * Storage path: process.env.PAPER_STORAGE_DIR or ./storage/papers (relative to backend)
 */
export class PaperStorageService {
  private static storageDir = process.env.PAPER_STORAGE_DIR || path.join(__dirname, '../../storage/papers')

  // Initialize storage directory
  static async init(): Promise<void> {
    await fs.ensureDir(this.storageDir)
  }

  // Store a PDF file and return storage path + checksum
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
    const storagePath = path.join(paperDir, filename)

    await fs.writeFile(storagePath, file)

    return {
      storagePath,
      checksum,
      fileSize: file.length
    }
  }

  // Get a readable stream for a paper
  static async getStream(storagePath: string): Promise<Readable> {
    // Verify file exists
    const exists = await fs.pathExists(storagePath)
    if (!exists) {
      throw new AppError(404, 'Paper file not found')
    }

    // Verify it's within our storage directory (security check)
    const realPath = await fs.realpath(storagePath)
    const realStorageDir = await fs.realpath(this.storageDir)

    if (!realPath.startsWith(realStorageDir)) {
      throw new AppError(403, 'Invalid file path')
    }

    return fs.createReadStream(storagePath)
  }

  // Get file buffer (for smaller operations)
  static async getBuffer(storagePath: string): Promise<Buffer> {
    // Verify file exists
    const exists = await fs.pathExists(storagePath)
    if (!exists) {
      throw new AppError(404, 'Paper file not found')
    }

    // Verify it's within our storage directory (security check)
    const realPath = await fs.realpath(storagePath)
    const realStorageDir = await fs.realpath(this.storageDir)

    if (!realPath.startsWith(realStorageDir)) {
      throw new AppError(403, 'Invalid file path')
    }

    return fs.readFile(storagePath)
  }

  // Delete a paper file
  static async delete(storagePath: string): Promise<void> {
    const exists = await fs.pathExists(storagePath)
    if (!exists) {
      return // Already deleted
    }

    // Verify it's within our storage directory (security check)
    const realPath = await fs.realpath(storagePath)
    const realStorageDir = await fs.realpath(this.storageDir)

    if (!realPath.startsWith(realStorageDir)) {
      throw new AppError(403, 'Invalid file path')
    }

    await fs.remove(storagePath)

    // Clean up empty paper directory
    const paperDir = path.dirname(storagePath)
    const files = await fs.readdir(paperDir)
    if (files.length === 0) {
      await fs.remove(paperDir)
    }
  }

  // Get file size
  static async getFileSize(storagePath: string): Promise<number> {
    const exists = await fs.pathExists(storagePath)
    if (!exists) {
      throw new AppError(404, 'Paper file not found')
    }

    const stats = await fs.stat(storagePath)
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
