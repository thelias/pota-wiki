import multer from 'multer'
import multerS3 from 'multer-s3'
import { S3Client } from '@aws-sdk/client-s3'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB

export const s3 = new S3Client({ region: process.env.AWS_REGION })

const storage = multerS3({
  s3,
  bucket: process.env.S3_BUCKET,
  contentType: (req, file, cb) => cb(null, file.mimetype),
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const parkRef = (req.params.ref || 'unknown').toUpperCase()
    cb(null, `activations/${parkRef}/${randomUUID()}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 4 },
})
