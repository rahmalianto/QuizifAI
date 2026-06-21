import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extract text content from a PDF file using pdf.js
 */
export async function extractFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n');
}

/**
 * Extract text content from a DOCX file using mammoth
 */
export async function extractFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Read a markdown/text file as plain text
 */
export async function extractFromMD(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Dispatch extraction based on file extension
 */
export async function extractText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    return extractFromPDF(file);
  }

  if (name.endsWith('.docx')) {
    return extractFromDOCX(file);
  }

  if (name.endsWith('.md') || name.endsWith('.txt')) {
    return extractFromMD(file);
  }

  throw new Error(`Unsupported file type: ${name}`);
}
