import multer from 'multer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB per file (pre-compression)
const MAX_DIMENSION  = 1920             // px — longest side

export const s3 = new S3Client({ region: process.env.AWS_REGION })

// Store in memory so Sharp can process before S3 upload
const storage = multer.memoryStorage()

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

// Call this after multer to compress + upload each file to S3
export async function processAndUpload(req) {
  if (!req.files?.length) return

  const parkRef = (req.params.ref || 'unknown').toUpperCase()

  await Promise.all(req.files.map(async file => {
    const key = `activations/${parkRef}/${randomUUID()}.jpg`

    const compressed = await sharp(file.buffer)
      .rotate()                          // auto-rotate from EXIF
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer()

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.S3_BUCKET,
      Key:         key,
      Body:        compressed,
      ContentType: 'image/jpeg',
    }))

    // Attach the same fields multer-s3 used to set, so reports.js works unchanged
    file.key      = key
    file.location = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
  }))
}
