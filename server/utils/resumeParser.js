import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Parses buffer of a PDF file to extract raw text content.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function parseResumePDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Failed to parse PDF resume:', error);
    throw new Error('Error extracting text from PDF resume: ' + error.message);
  }
}
