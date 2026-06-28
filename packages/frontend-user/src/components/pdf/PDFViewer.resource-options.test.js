const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const viewerPath = path.join(__dirname, 'PDFViewer.tsx');
const viewerSource = fs.readFileSync(viewerPath, 'utf8');
const newDocumentPagePath = path.join(__dirname, '../../app/documents/new/page.tsx');
const newDocumentPageSource = fs.readFileSync(newDocumentPagePath, 'utf8');

test('PDFViewer loads PDFs with app-hosted CMap and standard font assets', () => {
  assert.match(viewerSource, /import\('pdfjs-dist'\)/);
  assert.match(viewerSource, /GlobalWorkerOptions\.workerSrc = '\/pdf\.worker\.min\.mjs'/);
  assert.match(viewerSource, /cMapUrl: '\/pdfjs\/cmaps\/'/);
  assert.match(viewerSource, /cMapPacked: true/);
  assert.match(viewerSource, /standardFontDataUrl: '\/pdfjs\/standard_fonts\/'/);
  assert.match(viewerSource, /\.\.\.PDFJS_DOCUMENT_RESOURCE_OPTIONS/);
  assert.match(viewerSource, /pdfjsLib\.getDocument\(\{/);
  assert.doesNotMatch(viewerSource, /window\.pdfjsLib|cdnjs/);
});

test('PDFViewer includes CJK CMap and standard font assets required by PDF.js', () => {
  const publicDir = path.join(__dirname, '../../../public/pdfjs');

  assert.equal(fs.existsSync(path.join(__dirname, '../../../public/pdf.worker.min.mjs')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'cmaps/Adobe-GB1-UCS2.bcmap')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'cmaps/UniGB-UTF16-H.bcmap')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'standard_fonts/LiberationSans-Regular.ttf')), true);
});

test('personal document workspace preview sends its payload to the opened preview window', () => {
  assert.match(newDocumentPageSource, /WORKSPACE_SETUP_PREVIEW_MESSAGE_TYPE/);
  assert.match(newDocumentPageSource, /const payload = getWorkspacePreviewPayload\(\)/);
  assert.match(newDocumentPageSource, /sessionStorage\.setItem\(storageKey, JSON\.stringify\(payload\)\)/);
  assert.match(
    newDocumentPageSource,
    /const previewWindow = window\.open\(\s*`\/documents\/preview\$\{buildWorkspaceSetupPreviewStorageHash\(storageKey\)\}`,\s*'_blank'\s*\)/s
  );
  assert.match(
    newDocumentPageSource,
    /const message = \{\s*type: WORKSPACE_SETUP_PREVIEW_MESSAGE_TYPE,\s*storageKey,\s*payload,\s*\}/s
  );
  assert.match(newDocumentPageSource, /previewWindow\.postMessage\(message, window\.location\.origin\)/);
  assert.match(
    newDocumentPageSource,
    /window\.setTimeout\(\(\) => previewWindow\.postMessage\(message, window\.location\.origin\), 250\)/
  );
  assert.match(
    newDocumentPageSource,
    /window\.setTimeout\(\(\) => previewWindow\.postMessage\(message, window\.location\.origin\), 1000\)/
  );
  assert.doesNotMatch(newDocumentPageSource, /noopener|noreferrer/);
});
