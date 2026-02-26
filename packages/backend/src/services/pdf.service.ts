import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Certificate } from '@humory/shared';
import { logger } from '../utils/logger';

export class PDFService {
  /**
   * Generate a PDF certificate
   */
  static async generateCertificatePDF(certificate: Certificate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 72,
            bottom: 72,
            left: 72,
            right: 72,
          },
        });

        const buffers: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (buffer) => buffers.push(buffer));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', (err) => {
          logger.error('PDF generation error', { error: err });
          reject(err);
        });

        // Start building PDF
        this.buildCertificatePDF(doc, certificate);

        // Finalize PDF
        doc.end();
      } catch (error) {
        logger.error('Error in PDF generation', { error });
        reject(error);
      }
    });
  }

  /**
   * Build certificate PDF content
   */
  private static async buildCertificatePDF(doc: PDFKit.PDFDocument, certificate: Certificate) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 72;

    // Calculate metrics based on total authorship activity (typed + pasted)
    const totalAuthored = certificate.typedCharacters + certificate.pastedCharacters;
    const typedPercentage = totalAuthored > 0
      ? (certificate.typedCharacters / totalAuthored) * 100
      : 0;
    const pastedPercentage = totalAuthored > 0
      ? (certificate.pastedCharacters / totalAuthored) * 100
      : 0;

    const drawPageFrame = () => {
      doc
        .rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
        .stroke('#333333');
    };

    drawPageFrame();

    // Title section
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('Certificate of Authorship', margin + 40, margin + 40, {
        width: pageWidth - 2 * margin - 80,
        align: 'center',
      });

    // Decorative line
    doc
      .moveTo(margin + 100, margin + 90)
      .lineTo(pageWidth - margin - 100, margin + 90)
      .stroke('#4A90E2');

    // Document information
    let currentY = margin + 120;

    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#333333')
      .text('This certificate verifies the authorship of the following document:', margin + 40, currentY, {
        width: pageWidth - 2 * margin - 80,
        align: 'left',
      });

    currentY += 40;

    // Document title
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text(certificate.title, margin + 40, currentY, {
        width: pageWidth - 2 * margin - 80,
        align: 'center',
      });

    currentY += 30;

    // Author/Signer Name
    const displayName = certificate.signerName || 'Author';
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(`By: ${displayName}`, margin + 40, currentY, {
        width: pageWidth - 2 * margin - 80,
        align: 'center',
      });

    currentY += 40;

    // Certificate type badge
    const certTypeLabel = certificate.certificateType === 'full_authorship'
      ? 'Full Authorship'
      : 'Partial Authorship';

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#4A90E2')
      .text(certTypeLabel, margin + 40, currentY, {
        width: pageWidth - 2 * margin - 80,
        align: 'center',
      });

    currentY += 40;

    // Authorship statistics section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('Authorship Statistics', margin + 40, currentY);

    currentY += 30;

    const statsData = [
      { label: 'Total Characters:', value: certificate.totalCharacters.toString() },
      { label: 'Typed Characters:', value: `${certificate.typedCharacters} (${typedPercentage.toFixed(1)}%)` },
      { label: 'Pasted Characters:', value: `${certificate.pastedCharacters} (${pastedPercentage.toFixed(1)}%)` },
      { label: 'Total Events:', value: certificate.totalEvents.toString() },
      { label: 'Typing Events:', value: certificate.typingEvents.toString() },
      { label: 'Paste Events:', value: certificate.pasteEvents.toString() },
      { label: 'Editing Time:', value: `${Math.round(certificate.editingTimeSeconds / 60)} minutes` },
    ];

    doc.fontSize(11).font('Helvetica');

    statsData.forEach(({ label, value }) => {
      doc
        .fillColor('#555555')
        .text(label, margin + 60, currentY, { continued: true, width: 200 })
        .fillColor('#1a1a1a')
        .text(value, { width: pageWidth - 2 * margin - 140 });
      currentY += 22;
    });

    currentY += 20;

           // AI assistance statistics section (always show, even if zeros)
    const aiStats = (certificate as any).aiAuthorshipStats; // 如果 TS 类型还没加字段，先这样顶一下
    const selection = aiStats?.selectionActions;
    const questions = aiStats?.aiQuestions;

    const aiSelectionTotal = selection?.total ?? 0;
    const aiAccepted = selection?.accepted ?? 0;
    const aiRejected = selection?.rejected ?? 0;
    const aiAcceptanceRate = selection?.acceptanceRate ?? 0;

    const aiQuestionsTotal = questions?.total ?? 0;
    const aiUnderstanding = questions?.understanding ?? 0;
    const aiGeneration = questions?.generation ?? 0;
    const aiOther = questions?.other ?? 0;

    // Check page space
    if (currentY > pageHeight - margin - 260) {
      doc.addPage();
      drawPageFrame();
      currentY = margin + 40;
    }

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('AI Assistance Statistics', margin + 40, currentY);

    currentY += 30;

    const aiData = [
      { label: 'AI Questions:', value: aiQuestionsTotal.toString() },
      { label: '• Understanding:', value: aiUnderstanding.toString() },
      { label: '• Generation:', value: aiGeneration.toString() },
      { label: '• Other:', value: aiOther.toString() },
      { label: 'AI Selection Actions:', value: aiSelectionTotal.toString() },
      { label: '• Accepted:', value: aiAccepted.toString() },
      { label: '• Rejected:', value: aiRejected.toString() },
      { label: '• Acceptance Rate:', value: `${Number(aiAcceptanceRate).toFixed(1)}%` },
      { label: '• Grammar Fixes:', value: (selection?.grammarFixes ?? 0).toString() },
      { label: '• Improve Writing:', value: (selection?.improveWriting ?? 0).toString() },
      { label: '• Simplify:', value: (selection?.simplify ?? 0).toString() },
      { label: '• Make Formal:', value: (selection?.makeFormal ?? 0).toString() },
    ];

    doc.fontSize(11).font('Helvetica');

    aiData.forEach(({ label, value }) => {
      doc
        .fillColor('#555555')
        .text(label, margin + 60, currentY, { continued: true, width: 200 })
        .fillColor('#1a1a1a')
        .text(value, { width: pageWidth - 2 * margin - 140 });
      currentY += 22;
    });

    currentY += 20;

    // Full Text Content (if included)
    if (certificate.includeFullText && certificate.plainTextSnapshot) {
      // Add new page for full text if needed
      const textSectionStart = currentY;
      const availableHeight = pageHeight - currentY - margin - 100;

      // Check if we need a new page
      if (availableHeight < 200) {
        doc.addPage();
        drawPageFrame();
        currentY = margin + 40;
      }

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text('Document Content', margin + 40, currentY);

      currentY += 30;

      // Add full text with word wrapping
      const textLines = certificate.plainTextSnapshot.substring(0, 5000); // Limit to first 5000 chars
      const isTruncated = certificate.plainTextSnapshot.length > 5000;

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(textLines, margin + 60, currentY, {
          width: pageWidth - 2 * margin - 120,
          align: 'left',
        });

      currentY = doc.y + 20;

      if (isTruncated) {
        doc
          .fontSize(9)
          .fillColor('#999999')
          .text('[Content truncated. Full text available in JSON export.]', margin + 60, currentY, {
            width: pageWidth - 2 * margin - 120,
            align: 'center',
          });
        currentY += 30;
      }

      // Add new page for verification if text took too much space
      if (currentY > pageHeight - 300) {
        doc.addPage();
        drawPageFrame();
        currentY = margin + 40;
      }
    }

    // Verification section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('Verification', margin + 40, currentY);

    currentY += 30;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text('Verification Token:', margin + 60, currentY);

    currentY += 15;

    doc
      .fontSize(9)
      .font('Courier')
      .fillColor('#333333')
      .text(certificate.verificationToken, margin + 60, currentY, {
        width: pageWidth - 2 * margin - 120,
        lineBreak: true,
      });

    currentY += 40;

    // Generate QR code
    try {
      const verifyUrl = `https://app.humanly.art/verify/${certificate.verificationToken}`;
      const qrCodeDataURL = await QRCode.toDataURL(verifyUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');

      // Add QR code to PDF
      doc.image(qrBuffer, margin + 60, currentY, {
        width: 120,
        height: 120,
      });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(
          'Scan to verify',
          margin + 60,
          currentY + 130,
          { width: 120, align: 'center' }
        );

      // Verification URL
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text('Verify online at:', margin + 200, currentY);

      doc
        .fontSize(9)
        .font('Courier')
        .fillColor('#4A90E2')
        .text(verifyUrl, margin + 200, currentY + 15, {
          width: pageWidth - 2 * margin - 260,
          link: verifyUrl,
        });
    } catch (error) {
      logger.error('Error generating QR code for PDF', { error });
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(
          `Verify at: https://app.humanly.art/verify/${certificate.verificationToken}`,
          margin + 60,
          currentY,
          { width: pageWidth - 2 * margin - 120 }
        );
    }

    // Footer
    const footerY = pageHeight - margin - 80;

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        `Generated on ${new Date(certificate.generatedAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        margin + 40,
        footerY,
        {
          width: pageWidth - 2 * margin - 80,
          align: 'center',
        }
      );

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        'This certificate is cryptographically signed and can be verified at app.humanly.art',
        margin + 40,
        footerY + 20,
        {
          width: pageWidth - 2 * margin - 80,
          align: 'center',
        }
      );

    doc
      .fontSize(8)
      .font('Courier')
      .fillColor('#cccccc')
      .text(
        `Certificate ID: ${certificate.id}`,
        margin + 40,
        footerY + 40,
        {
          width: pageWidth - 2 * margin - 80,
          align: 'center',
        }
      );
  }
}
