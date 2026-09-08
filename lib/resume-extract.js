/**
 * Resume text extraction.
 *
 * Turns an uploaded file (PDF / DOCX / plain text) into raw text. All parsing
 * runs server-side on the Node.js runtime. We deliberately require the internal
 * pdf-parse entry (`pdf-parse/lib/pdf-parse.js`) because the package's index
 * file runs debug/test code on import, which breaks in a bundled environment.
 */

// mammoth is pure JS (DOCX -> text); safe on serverless.
import mammoth from "mammoth";

// Custom error so routes can map extraction failures to a clean 400/415.
export class ExtractError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ExtractError";
    this.status = status;
  }
}

const MAX_TEXT_CHARS = 40000; // hard cap so a huge doc can't blow up the prompt

/** Collapse excessive whitespace and trim to a safe length. */
function cleanText(text) {
  const cleaned = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return cleaned.slice(0, MAX_TEXT_CHARS);
}

/** Extract text from a PDF buffer. */
async function extractPdf(buffer) {
  // Lazy require to keep cold-start light and avoid the buggy index import.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const data = await pdfParse(buffer);
  return data.text || "";
}

/** Extract text from a DOCX buffer. */
async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

/**
 * Extract text from an uploaded file.
 *
 * @param {Buffer} buffer   raw file bytes
 * @param {string} filename original filename (used to detect type)
 * @param {string} mimetype content-type (fallback for detection)
 * @returns {Promise<string>} cleaned resume text
 */
export async function extractResumeText(buffer, filename = "", mimetype = "") {
  if (!buffer || buffer.length === 0) {
    throw new ExtractError("Uploaded file is empty");
  }

  const name = String(filename).toLowerCase();
  const mime = String(mimetype).toLowerCase();

  let raw;
  try {
    if (name.endsWith(".pdf") || mime.includes("pdf")) {
      raw = await extractPdf(buffer);
    } else if (
      name.endsWith(".docx") ||
      mime.includes("officedocument.wordprocessingml")
    ) {
      raw = await extractDocx(buffer);
    } else if (
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      mime.startsWith("text/")
    ) {
      raw = buffer.toString("utf-8");
    } else {
      throw new ExtractError(
        "Unsupported file type. Upload a PDF, DOCX, or plain-text resume.",
        415,
      );
    }
  } catch (err) {
    if (err instanceof ExtractError) throw err;
    throw new ExtractError(`Could not read the file: ${err.message}`);
  }

  const text = cleanText(raw);
  if (text.length < 30) {
    throw new ExtractError(
      "Could not extract readable text. If this is a scanned/image PDF, paste the text instead.",
    );
  }
  return text;
}

export { MAX_TEXT_CHARS };
