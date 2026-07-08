/**
 * Activation report routes
 *
 * GET    /api/parks/:ref/reports          List all reports for a park
 * POST   /api/parks/:ref/reports          Submit a new report (requires auth)
 * DELETE /api/reports/:id                 Delete a report (owner only)
 */

import { Router } from 'express'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import pool from '../db/pool.js'
import { upload } from '../middleware/upload.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const s3 = new S3Client({ region: process.env.AWS_REGION })

const router = Router({ mergeParams: true })

// ── List reports for a park ──────────────────────────────────────────────────

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const ref = req.params.ref.toUpperCase()

    const { rows: reports } = await pool.query(
      `SELECT * FROM activation_reports
       WHERE park_reference = $1
       ORDER BY created_at DESC`,
      [ref]
    )

    if (reports.length) {
      const ids = reports.map(r => r.id)
      const { rows: photos } = await pool.query(
        `SELECT * FROM report_photos WHERE report_id = ANY($1)`,
        [ids]
      )
      const photosByReport = {}
      photos.forEach(p => {
        if (!photosByReport[p.report_id]) photosByReport[p.report_id] = []
        photosByReport[p.report_id].push(p)
      })
      reports.forEach(r => { r.photos = photosByReport[r.id] || [] })
    }

    res.json(reports)
  } catch (err) {
    next(err)
  }
})

// ── Submit a report ──────────────────────────────────────────────────────────

router.post('/', requireAuth, upload.array('photos', 4), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const ref = req.params.ref.toUpperCase()

    const { rows: parkRows } = await client.query(
      'SELECT reference FROM parks WHERE reference = $1', [ref]
    )
    if (!parkRows.length)
      return res.status(404).json({ error: `Park ${ref} not found. Sync it first.` })

    const {
      activation_date, cell_service, bathrooms,
      qrm_level, parking, setup_locations, general_comments,
      cell_provider, antenna, power_watts,
    } = req.body

    // mode and bands may arrive as single string or array from multipart form
    const toArr = raw => raw ? (Array.isArray(raw) ? raw : [raw]).filter(Boolean) : []
    const mode  = toArr(req.body.mode)
    const bands = toArr(req.body.bands)

    // Callsign always comes from the authenticated user — not the request body
    const callsign = req.user.callsign

    const VALID_BOOL  = ['yes', 'no', 'unknown', undefined, null, '']
    const VALID_QRM   = ['very-low', 'low', 'normal', 'high', 'very-high', undefined, null, '']
    const VALID_MODES = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']
    const VALID_BANDS = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm']
    if (!VALID_BOOL.includes(cell_service)) return res.status(400).json({ error: 'Invalid cell_service value' })
    if (!VALID_BOOL.includes(bathrooms))   return res.status(400).json({ error: 'Invalid bathrooms value' })
    if (!VALID_QRM.includes(qrm_level))    return res.status(400).json({ error: 'Invalid qrm_level value' })
    if (mode.some(m => !VALID_MODES.includes(m)))  return res.status(400).json({ error: 'Invalid mode value' })
    if (bands.some(b => !VALID_BANDS.includes(b))) return res.status(400).json({ error: 'Invalid band value' })

    const parsedPower = power_watts ? parseInt(power_watts, 10) : null

    await client.query('BEGIN')

    // only store cell_provider if cell_service was actually set
    const storedCellProvider = (cell_service === 'yes' || cell_service === 'no')
      ? (cell_provider || null)
      : null

    const { rows: [report] } = await client.query(
      `INSERT INTO activation_reports
         (park_reference, callsign, activation_date, cell_service, cell_provider, bathrooms,
          qrm_level, parking, setup_locations, general_comments, antenna, mode, power_watts, bands, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        ref,
        callsign,
        activation_date   || null,
        cell_service      || null,
        storedCellProvider,
        bathrooms         || null,
        qrm_level         || null,
        parking           || null,
        setup_locations   || null,
        general_comments  || null,
        antenna           || null,
        mode.length  ? mode  : null,
        parsedPower,
        bands.length ? bands : null,
        req.user.userId,
      ]
    )

    const photos = []
    if (req.files?.length) {
      for (const file of req.files) {
        const { rows: [photo] } = await client.query(
          `INSERT INTO report_photos (report_id, filename, url, original_name, mime_type, size_bytes)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [report.id, file.key, file.location, file.originalname, file.mimetype, file.size]
        )
        photos.push(photo)
      }
    }

    await client.query('COMMIT')
    report.photos = photos
    res.status(201).json(report)
  } catch (err) {
    await client.query('ROLLBACK')
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}))
    next(err)
  } finally {
    client.release()
  }
})

// ── Delete a report (owner only) ─────────────────────────────────────────────
// Mounted separately at DELETE /api/reports/:id

export const deleteReport = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid report ID' })

    const { rows } = await pool.query(
      'SELECT user_id FROM activation_reports WHERE id = $1', [id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Report not found' })
    if (rows[0].user_id !== req.user.userId)
      return res.status(403).json({ error: 'You can only delete your own reports' })

    const { rows: photos } = await pool.query(
      'SELECT filename FROM report_photos WHERE report_id = $1', [id]
    )

    await pool.query('DELETE FROM activation_reports WHERE id = $1', [id])

    // Delete photos from S3 (filename stores the S3 key)
    await Promise.allSettled(
      photos.map(p => s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: p.filename,
      })))
    )

    res.json({ deleted: id })
  } catch (err) {
    next(err)
  }
}

export default router
