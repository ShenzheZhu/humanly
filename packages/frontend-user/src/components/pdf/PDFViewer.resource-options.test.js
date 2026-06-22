const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const viewerPath = path.join(__dirname, 'PDFViewer.tsx');
const viewerSource = fs.readFileSync(viewerPath, 'utf8');

test('PDFViewer loads PDFs with app-hosted CMap and standard font assets', () => {
  assert.match(viewerSource, /cMapUrl: '\/pdfjs\/cmaps\/'/);
  assert.match(viewerSource, /cMapPacked: true/);
  assert.match(viewerSource, /standardFontDataUrl: '\/pdfjs\/standard_fonts\/'/);
  assert.match(viewerSource, /\.\.\.PDFJS_DOCUMENT_RESOURCE_OPTIONS/);
  assert.match(viewerSource, /window\.pdfjsLib\.getDocument\(\{/);
});

test('PDFViewer includes CJK CMap and standard font assets required by PDF.js', () => {
  const publicDir = path.join(__dirname, '../../../public/pdfjs');

  assert.equal(fs.existsSync(path.join(publicDir, 'cmaps/Adobe-GB1-UCS2.bcmap')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'cmaps/UniGB-UTF16-H.bcmap')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'standard_fonts/LiberationSans-Regular.ttf')), true);
});
