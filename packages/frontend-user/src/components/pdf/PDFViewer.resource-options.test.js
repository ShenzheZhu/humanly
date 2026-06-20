const fs = require('node:fs');
const path = require('node:path');

describe('PDFViewer PDF.js resource configuration', () => {
  const viewerPath = path.join(__dirname, 'PDFViewer.tsx');
  const viewerSource = fs.readFileSync(viewerPath, 'utf8');

  it('loads PDFs with app-hosted CMap and standard font assets', () => {
    expect(viewerSource).toContain("cMapUrl: '/pdfjs/cmaps/'");
    expect(viewerSource).toContain('cMapPacked: true');
    expect(viewerSource).toContain("standardFontDataUrl: '/pdfjs/standard_fonts/'");
    expect(viewerSource).toContain('...PDFJS_DOCUMENT_RESOURCE_OPTIONS');
    expect(viewerSource).toContain('window.pdfjsLib.getDocument({');
  });

  it('includes CJK CMap and standard font assets required by PDF.js', () => {
    const publicDir = path.join(__dirname, '../../../public/pdfjs');

    expect(fs.existsSync(path.join(publicDir, 'cmaps/Adobe-GB1-UCS2.bcmap'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'cmaps/UniGB-UTF16-H.bcmap'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'standard_fonts/LiberationSans-Regular.ttf'))).toBe(true);
  });
});
