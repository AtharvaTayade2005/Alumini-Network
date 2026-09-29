import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'
import multer from 'multer'
import config from '../config/env.js'
import { unprocessable } from '../utils/errors.js'

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const resumeMimes = new Set(config.uploads.allowedMime)

function memoryStorage() {
  return multer.memoryStorage()
}

function filterFactory(allowed) {
  return (_req, file, cb) => {
    if (!allowed.includes(file.mimetype)) {
      return cb(unprocessable(
        `Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`,
      ))
    }
    cb(null, true)
  }
}

export const uploadResume = multer({
  storage: memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes, files: 1 },
  fileFilter: filterFactory([...config.uploads.allowedMime]),
}).single('file')

export const uploadAvatar = multer({
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: filterFactory(IMAGE_MIME),
}).single('file')

/**
 * Validates extension and magic bytes, not just the client-declared mimetype.
 * The stored filename is generated, so user input never reaches the filesystem path.
 */
export async function assertValidResumeFile(file) {
  if (!file) throw unprocessable('No file was uploaded')
  if (file.size === 0) throw unprocessable('The uploaded file is empty')
  if (file.size > config.uploads.maxBytes) {
    throw unprocessable(`File exceeds the ${config.uploads.maxBytes} byte limit`)
  }

  const ext = path.extname(file.originalname || '').toLowerCase()
  if (!config.uploads.allowedExtensions.includes(ext)) {
    throw unprocessable(
      `Unsupported file extension: ${ext || 'none'}. Allowed: ${config.uploads.allowedExtensions.join(', ')}`,
    )
  }
  if (!resumeMimes.has(file.mimetype)) {
    throw unprocessable('The file content type is not an accepted document type')
  }

  const signature = detectSignature(file.buffer)
  if (!signature.matched) {
    throw unprocessable('The file contents do not match a supported document format')
  }
  return signature
}

function detectSignature(buffer) {
  if (buffer.length < 8) return { matched: false }

  const isPdf = buffer.subarray(0, 5).toString('latin1') === '%PDF-'
  const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf
    && buffer[2] === 0x11 && buffer[3] === 0xe0
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b
    && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)

  if (isPdf) return { matched: true, kind: 'pdf' }
  if (isOle) return { matched: true, kind: 'doc' }
  if (isZip) return detectZipKind(buffer)
  return { matched: false }
}

/**
 * A .docx is an OOXML zip, but a zip is also what a .xlsx or .jar is, so the
 * archive must be confirmed as a Word document. Entry names live in the local
 * file headers and in the central directory at the end of the file, so the
 * whole buffer is searched rather than just the first bytes.
 */
function detectZipKind(buffer) {
  // End-of-central-directory record: proves it is a well-formed zip.
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd === -1) return { matched: false }

  const text = buffer.toString('latin1')
  if (!text.includes('word/document.xml')) return { matched: false }

  const isSpreadsheet = text.includes('xl/workbook.xml')
  const isPresentation = text.includes('ppt/presentation.xml')
  if (isSpreadsheet || isPresentation) return { matched: false }

  return { matched: true, kind: 'docx' }
}

export function generateStoredName(userId, ext) {
  return `${userId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
}

export async function writeLocalFile(dir, filename, buffer) {
  await fs.mkdir(dir, { recursive: true })
  const fullPath = path.join(dir, filename)
  await fs.writeFile(fullPath, buffer)
  return fullPath
}

export async function removeLocalFile(dir, filename) {
  if (!filename) return
  const fullPath = path.join(dir, path.basename(filename))
  await fs.rm(fullPath, { force: true })
}

/**
 * Files are never served from a public static mount. Access is granted per
 * request through the resume service after an authorization check.
 */
export function wrapUpload(middleware) {
  return (req, res, next) => middleware(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(unprocessable(`File exceeds the ${config.uploads.maxBytes} byte limit`))
      }
      return next(unprocessable(`Upload failed: ${error.message}`))
    }
    next(error)
  })
}
