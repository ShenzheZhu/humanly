import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { CertificateModel } from '../models/certificate.model';
import { DocumentModel } from '../models/document.model';
import { DocumentEventModel } from '../models/document-event.model';
import {
  Certificate,
  CertificateFilters,
  CertificateVerification,
  CertificateMetrics,
  JSONCertificate,
  PaginatedResult,
} from '@humory/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class CertificateService {
  /**
   * Generate a certificate for a document
   */
  static async generateCertificate(
    documentId: string,
    userId: string,
    options: {
      certificateType?: 'full_authorship' | 'partial_authorship';
      signerName?: string;
      includeFullText?: boolean;
      includeEditHistory?: boolean;
      accessCode?: string;
    } = {}
  ): Promise<Certificate> {
    try {
      const {
        certificateType = 'full_authorship',
        signerName,
        includeFullText = true,
        includeEditHistory = true,
        accessCode,
      } = options;

      logger.info('Generating certificate', { documentId, userId, certificateType, options });

      // Get document
      const document = await DocumentModel.findByIdAndUserId(documentId, userId);
      if (!document) {
        throw new AppError(404, 'Document not found or unauthorized');
      }

      // Calculate certificate metrics
      const metrics = await this.calculateCertificateMetrics(documentId, userId);

      // Generate verification token
      const verificationToken = this.generateVerificationToken();

      // Hash access code if provided
      let accessCodeHash: string | undefined;
      let accessCodePlaintext: string | undefined;
      let isProtected = false;
      if (accessCode) {
        accessCodeHash = await bcrypt.hash(accessCode, 10);
        accessCodePlaintext = accessCode;
        isProtected = true;
      }

      // Generate JWT signature
      const signature = this.generateSignature({
        documentId,
        userId,
        title: document.title,
        metrics,
        contentHash: this.hashContent(document.content),
      });

      // Create certificate
      const certificate = await CertificateModel.create({
        documentId,
        userId,
        certificateType,
        title: document.title,
        documentSnapshot: document.content,
        plainTextSnapshot: document.plainText,
        totalEvents: metrics.totalEvents,
        typingEvents: metrics.typingEvents,
        pasteEvents: metrics.pasteEvents,
        totalCharacters: document.characterCount,
        typedCharacters: metrics.typedCharacters,
        pastedCharacters: metrics.pastedCharacters,
        editingTimeSeconds: Math.round(metrics.editingTimeSeconds),
        signature,
        verificationToken,
        signerName,
        includeFullText,
        includeEditHistory,
        accessCode: accessCodePlaintext,
        accessCodeHash,
        isProtected,
      });

      logger.info('Certificate generated successfully', {
        certificateId: certificate.id,
        documentId,
        userId,
      });

      return certificate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error generating certificate', { error, documentId, userId });
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  static async getCertificate(certificateId: string, userId: string): Promise<Certificate> {
    try {
      const certificate = await CertificateModel.findByIdAndUserId(certificateId, userId);

      if (!certificate) {
        throw new AppError('Certificate not found or unauthorized', 404);
      }

      return certificate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching certificate', { error, certificateId, userId });
      throw error;
    }
  }

  /**
   * Verify access code for protected certificate
   */
  static async verifyAccessCode(
    certificateId: string,
    userId: string,
    accessCode: string
  ): Promise<boolean> {
    try {
      const certificate = await CertificateModel.findByIdAndUserId(certificateId, userId);

      if (!certificate) {
        throw new AppError(404, 'Certificate not found or unauthorized');
      }

      if (!certificate.isProtected) {
        return true; // Not protected, access granted
      }

      if (!certificate.accessCodeHash) {
        throw new AppError(500, 'Certificate is protected but no access code hash found');
      }

      const isValid = await bcrypt.compare(accessCode, certificate.accessCodeHash);
      return isValid;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error verifying access code', { error, certificateId, userId });
      throw error;
    }
  }

  /**
   * List user's certificates
   */
  static async listCertificates(
    userId: string,
    filters: CertificateFilters
  ): Promise<PaginatedResult<Certificate>> {
    try {
      return await CertificateModel.findByUserId(userId, filters);
    } catch (error) {
      logger.error('Error listing certificates', { error, userId });
      throw error;
    }
  }

  /**
   * Generate JSON certificate for download
   */
  static async generateJSON(certificate: Certificate): Promise<JSONCertificate> {
    // Calculate percentages based on total authorship activity (typed + pasted)
    const totalAuthored = certificate.typedCharacters + certificate.pastedCharacters;
    const typedPercentage = totalAuthored > 0
      ? (certificate.typedCharacters / totalAuthored) * 100
      : 0;

    const pastedPercentage = totalAuthored > 0
      ? (certificate.pastedCharacters / totalAuthored) * 100
      : 0;

    const jsonCertificate: JSONCertificate = {
      version: '1.0',
      certificateId: certificate.id,
      documentId: certificate.documentId,
      userId: certificate.userId,
      generatedAt: certificate.generatedAt.toISOString(),
      document: {
        title: certificate.title,
        wordCount: 0, // Would need to calculate from plain_text_snapshot
        characterCount: certificate.totalCharacters,
      },
      authorship: {
        totalCharacters: certificate.totalCharacters,
        typedCharacters: certificate.typedCharacters,
        pastedCharacters: certificate.pastedCharacters,
        typedPercentage: Math.round(typedPercentage * 10) / 10,
        pastedPercentage: Math.round(pastedPercentage * 10) / 10,
        totalEvents: certificate.totalEvents,
        typingEvents: certificate.typingEvents,
        pasteEvents: certificate.pasteEvents,
        editingTimeMinutes: Math.round(certificate.editingTimeSeconds / 60),
      },
      verification: {
        token: certificate.verificationToken,
        verifyUrl: `http://localhost:3002/verify/${certificate.verificationToken}`,
        signature: certificate.signature,
      },
    };

    return jsonCertificate;
  }

  /**
   * Verify certificate by verification token
   */
  static async verifyCertificate(verificationToken: string): Promise<CertificateVerification> {
    try {
      const certificate = await CertificateModel.findByVerificationToken(verificationToken);

      if (!certificate) {
        return {
          valid: false,
          certificate: null,
          verifiedAt: new Date(),
          message: 'Certificate not found',
        };
      }

      // Verify JWT signature
      try {
        jwt.verify(certificate.signature, env.jwtSecret);

        return {
          valid: true,
          certificate,
          verifiedAt: new Date(),
          message: 'Certificate is valid and authentic',
        };
      } catch (error) {
        return {
          valid: false,
          certificate,
          verifiedAt: new Date(),
          message: 'Certificate signature is invalid or has been tampered with',
        };
      }
    } catch (error) {
      logger.error('Error verifying certificate', { error, verificationToken });
      throw error;
    }
  }

  /**
   * Calculate certificate metrics from document events
   */
  private static async calculateCertificateMetrics(
    documentId: string,
    _userId: string
  ): Promise<CertificateMetrics> {
    // Get event metrics
    const eventMetrics = await DocumentEventModel.getEventMetrics(documentId);

    // Calculate typed vs pasted characters
    const { typedCharacters, pastedCharacters } =
      await DocumentEventModel.calculateTypingMetrics(documentId);

    const totalCharacters = typedCharacters + pastedCharacters;
    const typedPercentage = totalCharacters > 0 ? (typedCharacters / totalCharacters) * 100 : 0;
    const pastedPercentage = totalCharacters > 0 ? (pastedCharacters / totalCharacters) * 100 : 0;

    return {
      totalEvents: eventMetrics.totalEvents,
      typingEvents: eventMetrics.typingEvents,
      pasteEvents: eventMetrics.pasteEvents,
      totalCharacters,
      typedCharacters,
      pastedCharacters,
      editingTimeSeconds: eventMetrics.editingDurationSeconds,
      typedPercentage,
      pastedPercentage,
    };
  }

  /**
   * Generate JWT signature for certificate
   */
  private static generateSignature(data: {
    documentId: string;
    userId: string;
    title: string;
    metrics: CertificateMetrics;
    contentHash: string;
  }): string {
    const payload = {
      documentId: data.documentId,
      userId: data.userId,
      title: data.title,
      contentHash: data.contentHash,
      typedCharacters: data.metrics.typedCharacters,
      pastedCharacters: data.metrics.pastedCharacters,
      totalEvents: data.metrics.totalEvents,
      editingTimeSeconds: data.metrics.editingTimeSeconds,
      issuedAt: Date.now(),
    };

    // Sign with JWT (no expiration for certificates)
    return jwt.sign(payload, env.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Generate unique verification token
   */
  private static generateVerificationToken(): string {
    // Generate a random 32-byte token and convert to hex
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash document content for integrity verification
   */
  private static hashContent(content: Record<string, any>): string {
    const contentString = JSON.stringify(content);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  /**
   * Verify certificate with access code (for public verification of protected certificates)
   */
  static async verifyCertificateWithAccessCode(
    verificationToken: string,
    accessCode: string
  ): Promise<CertificateVerification> {
    try {
      const certificate = await CertificateModel.findByVerificationToken(verificationToken);

      if (!certificate) {
        return {
          valid: false,
          certificate: null,
          verifiedAt: new Date(),
          message: 'Certificate not found',
        };
      }

      // Check if certificate is protected
      if (!certificate.isProtected) {
        // Not protected, just verify signature
        try {
          jwt.verify(certificate.signature, env.jwtSecret);
          return {
            valid: true,
            certificate,
            verifiedAt: new Date(),
            message: 'Certificate is valid and authentic',
          };
        } catch (error) {
          return {
            valid: false,
            certificate,
            verifiedAt: new Date(),
            message: 'Certificate signature is invalid or has been tampered with',
          };
        }
      }

      // Certificate is protected, verify access code
      if (!certificate.accessCodeHash) {
        return {
          valid: false,
          certificate: null,
          verifiedAt: new Date(),
          message: 'Certificate is protected but no access code configured',
        };
      }

      const isAccessCodeValid = await bcrypt.compare(accessCode, certificate.accessCodeHash);

      if (!isAccessCodeValid) {
        return {
          valid: false,
          certificate: null,
          verifiedAt: new Date(),
          message: 'Invalid access code',
        };
      }

      // Access code is valid, verify signature
      try {
        jwt.verify(certificate.signature, env.jwtSecret);
        return {
          valid: true,
          certificate,
          verifiedAt: new Date(),
          message: 'Certificate is valid and authentic',
        };
      } catch (error) {
        return {
          valid: false,
          certificate,
          verifiedAt: new Date(),
          message: 'Certificate signature is invalid or has been tampered with',
        };
      }
    } catch (error) {
      logger.error('Error verifying certificate with access code', { error, verificationToken });
      throw error;
    }
  }

  /**
   * Update certificate access code
   */
  static async updateAccessCode(
    certificateId: string,
    userId: string,
    accessCode?: string
  ): Promise<Certificate> {
    try {
      // Verify ownership
      const certificate = await CertificateModel.findByIdAndUserId(certificateId, userId);

      if (!certificate) {
        throw new AppError(404, 'Certificate not found or unauthorized');
      }

      let accessCodeHash: string | null = null;
      let accessCodePlaintext: string | null = null;
      let isProtected = false;

      if (accessCode) {
        // Set or update access code
        accessCodeHash = await bcrypt.hash(accessCode, 10);
        accessCodePlaintext = accessCode;
        isProtected = true;
      }

      // Update certificate
      const updated = await CertificateModel.updateAccessCode(
        certificateId,
        accessCodePlaintext,
        accessCodeHash,
        isProtected
      );

      if (!updated) {
        throw new AppError(500, 'Failed to update access code');
      }

      logger.info('Certificate access code updated', {
        certificateId,
        userId,
        isProtected,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating certificate access code', { error, certificateId, userId });
      throw error;
    }
  }

  /**
   * Update certificate display options
   */
  static async updateDisplayOptions(
    certificateId: string,
    userId: string,
    includeFullText?: boolean,
    includeEditHistory?: boolean
  ): Promise<Certificate> {
    try {
      // Verify ownership
      const certificate = await CertificateModel.findByIdAndUserId(certificateId, userId);

      if (!certificate) {
        throw new AppError(404, 'Certificate not found or unauthorized');
      }

      // Update display options
      const updated = await CertificateModel.updateDisplayOptions(
        certificateId,
        includeFullText !== undefined ? includeFullText : certificate.includeFullText,
        includeEditHistory !== undefined ? includeEditHistory : certificate.includeEditHistory
      );

      if (!updated) {
        throw new AppError(500, 'Failed to update display options');
      }

      logger.info('Certificate display options updated', {
        certificateId,
        userId,
        includeFullText: updated.includeFullText,
        includeEditHistory: updated.includeEditHistory,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating certificate display options', { error, certificateId, userId });
      throw error;
    }
  }

  /**
   * Delete certificate (optional - for user management)
   */
  static async deleteCertificate(certificateId: string, userId: string): Promise<void> {
    try {
      const deleted = await CertificateModel.delete(certificateId, userId);

      if (!deleted) {
        throw new AppError('Certificate not found or unauthorized', 404);
      }

      logger.info('Certificate deleted', { certificateId, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting certificate', { error, certificateId, userId });
      throw error;
    }
  }
}
