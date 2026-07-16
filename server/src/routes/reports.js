/**
 * Activation report routes
 *
 * GET    /api/parks/:ref/reports          List all reports for a park
 * POST   /api/parks/:ref/reports          Submit a new report (requires auth)
 * DELETE /api/reports/:id                 Delete a report (owner only)
 */

import { Router } from 'express'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
// S3 uploads are handled by processAndUpload in upload.js
import pool from '../db/pool.js'
import { upload, processAndUpload } from '../middleware/upload.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const s3 = new S3Client({ region: process.env.AWS_REGION })

const router = Router({ mergeParams: true })

// ── List reports for a park ──────────────────────────────────────────────────

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const ref    = req.params.ref.toUpperCase()
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
    const offset = (page - 1) * limit

    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM activation_reports WHERE park_reference = $1', [ref]
    )
    const total      = parseInt(count)
    const totalPages = Math.ceil(total / limit) || 1

    const { rows: reports } = await pool.query(
      `SELECT * FROM activation_reports
       WHERE park_reference = $1
       ORDER BY activation_date DESC NULLS LAST, created_at DESC
       LIMIT $2 OFFSET $3`,
      [ref, limit, offset]
    )

    if (reports.length) {
      const ids = reports.map(r => r.id)
      const { rows: photos } = await pool.query(
        `SELECT * FROM report_photos WHERE report_id = ANY($1)`, [ids]
      )
      const byReport = {}
      photos.forEach(p => {
        if (!byReport[p.report_id]) byReport[p.report_id] = []
        byReport[p.report_id].push(p)
      })
      reports.forEach(r => { r.photos = byReport[r.id] || [] })
    }

    res.json({ reports, total, page, totalPages, limit })
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
      parking_availability, busyness, time_of_day,
    } = req.body

    // mode and bands may arrive as single string or array from multipart form
    const toArr = raw => raw ? (Array.isArray(raw) ? raw : [raw]).filter(Boolean) : []
    const mode  = toArr(req.body.mode)
    const bands = toArr(req.body.bands)

    // Callsign always comes from the authenticated user — not the request body
    const callsign = req.user.callsign

    const VALID_BOOL     = ['yes', 'no', 'unknown', undefined, null, '']
    const VALID_QRM      = ['very-low', 'low', 'normal', 'high', 'very-high', undefined, null, '']
    const VALID_MODES    = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']
    const VALID_BANDS    = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm']
    const VALID_PARKING  = ['good', 'okay', 'bad', undefined, null, '']
    const VALID_BUSYNESS = ['quiet', 'moderate', 'busy', undefined, null, '']
    const VALID_TOD      = ['morning', 'afternoon', 'evening', undefined, null, '']
    if (!VALID_BOOL.includes(cell_service))      return res.status(400).json({ error: 'Invalid cell_service value' })
    if (!VALID_BOOL.includes(bathrooms))         return res.status(400).json({ error: 'Invalid bathrooms value' })
    if (!VALID_QRM.includes(qrm_level))          return res.status(400).json({ error: 'Invalid qrm_level value' })
    if (!VALID_PARKING.includes(parking_availability))  return res.status(400).json({ error: 'Invalid parking_availability value' })
    if (!VALID_BUSYNESS.includes(busyness))      return res.status(400).json({ error: 'Invalid busyness value' })
    if (!VALID_TOD.includes(time_of_day))        return res.status(400).json({ error: 'Invalid time_of_day value' })
    if (mode.some(m => !VALID_MODES.includes(m)))  return res.status(400).json({ error: 'Invalid mode value' })
    if (bands.some(b => !VALID_BANDS.includes(b))) return res.status(400).json({ error: 'Invalid band value' })

    const parsedPower = power_watts ? parseInt(power_watts, 10) : null

    await processAndUpload(req)

    await client.query('BEGIN')

    // only store cell_provider if cell_service was actually set
    const storedCellProvider = (cell_service === 'yes' || cell_service === 'no')
      ? (cell_provider || null)
      : null

    const { rows: [report] } = await client.query(
      `INSERT INTO activation_reports
         (park_reference, callsign, activation_date, cell_service, cell_provider, bathrooms,
          qrm_level, parking, setup_locations, general_comments, antenna, mode, power_watts, bands, user_id,
          parking_availability, busyness, time_of_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        ref,
        callsign,
        activation_date      || null,
        cell_service         || null,
        storedCellProvider,
        bathrooms            || null,
        qrm_level            || null,
        parking              || null,
        setup_locations      || null,
        general_comments     || null,
        antenna              || null,
        mode.length  ? mode  : null,
        parsedPower,
        bands.length ? bands : null,
        req.user.userId,
        parking_availability || null,
        busyness             || null,
        time_of_day          || null,
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

    await client.query(
      'UPDATE users SET report_count = report_count + 1 WHERE id = $1',
      [req.user.userId]
    )

    await client.query('COMMIT')
    report.photos = photos
    res.status(201).json(report)
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
})

// ── Edit a report (owner only) ───────────────────────────────────────────────
// Mounted separately at PUT /api/reports/:id

export const editReport = async (req, res, next) => {
  const client = await pool.connect()
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid report ID' })

    const { rows } = await client.query('SELECT * FROM activation_reports WHERE id = $1', [id])
    if (!rows.length) return res.status(404).json({ error: 'Report not found' })
    if (rows[0].user_id !== req.user.userId)
      return res.status(403).json({ error: 'You can only edit your own reports' })

    const parkRef = rows[0].park_reference

    const {
      activation_date, cell_service, bathrooms, qrm_level,
      parking, setup_locations, general_comments, cell_provider, antenna, power_watts,
      parking_availability, busyness, time_of_day,
    } = req.body

    const toArr = raw => raw ? (Array.isArray(raw) ? raw : [raw]).filter(Boolean) : []
    const mode  = toArr(req.body.mode)
    const bands = toArr(req.body.bands)

    const VALID_BOOL     = ['yes', 'no', 'unknown', undefined, null, '']
    const VALID_QRM      = ['very-low', 'low', 'normal', 'high', 'very-high', undefined, null, '']
    const VALID_MODES    = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']
    const VALID_BANDS    = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm']
    const VALID_PARKING  = ['good', 'okay', 'bad', undefined, null, '']
    const VALID_BUSYNESS = ['quiet', 'moderate', 'busy', undefined, null, '']
    const VALID_TOD      = ['morning', 'afternoon', 'evening', undefined, null, '']
    if (!VALID_BOOL.includes(cell_service))             return res.status(400).json({ error: 'Invalid cell_service value' })
    if (!VALID_BOOL.includes(bathrooms))                return res.status(400).json({ error: 'Invalid bathrooms value' })
    if (!VALID_QRM.includes(qrm_level))                 return res.status(400).json({ error: 'Invalid qrm_level value' })
    if (!VALID_PARKING.includes(parking_availability))  return res.status(400).json({ error: 'Invalid parking_availability value' })
    if (!VALID_BUSYNESS.includes(busyness))             return res.status(400).json({ error: 'Invalid busyness value' })
    if (!VALID_TOD.includes(time_of_day))               return res.status(400).json({ error: 'Invalid time_of_day value' })
    if (mode.some(m  => !VALID_MODES.includes(m)))      return res.status(400).json({ error: 'Invalid mode value' })
    if (bands.some(b => !VALID_BANDS.includes(b)))      return res.status(400).json({ error: 'Invalid band value' })

    const parsedPower        = power_watts ? parseInt(power_watts, 10) : null
    const storedCellProvider = (cell_service === 'yes' || cell_service === 'no') ? (cell_provider || null) : null
    const removePhotoIds     = req.body.removePhotoIds ? JSON.parse(req.body.removePhotoIds) : []

    await client.query('BEGIN')

    // Delete removed photos from S3 + DB
    if (removePhotoIds.length) {
      const { rows: toDelete } = await client.query(
        'SELECT filename FROM report_photos WHERE id = ANY($1) AND report_id = $2',
        [removePhotoIds, id]
      )
      await Promise.allSettled(
        toDelete.map(p => s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: p.filename })))
      )
      await client.query('DELETE FROM report_photos WHERE id = ANY($1) AND report_id = $2', [removePhotoIds, id])
    }

    // Upload new photos
    if (req.files?.length) {
      req.params.ref = parkRef
      await processAndUpload(req)
      for (const file of req.files) {
        await client.query(
          `INSERT INTO report_photos (report_id, filename, url, original_name, mime_type, size_bytes)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, file.key, file.location, file.originalname, file.mimetype, file.size]
        )
      }
    }

    // Update fields
    const { rows: [updated] } = await client.query(
      `UPDATE activation_reports SET
         activation_date = $1, cell_service = $2, cell_provider = $3, bathrooms = $4,
         qrm_level = $5, parking = $6, setup_locations = $7, general_comments = $8,
         antenna = $9, mode = $10, power_watts = $11, bands = $12,
         parking_availability = $13, busyness = $14, time_of_day = $15,
         updated_at = now()
       WHERE id = $16 RETURNING *`,
      [
        activation_date      || null, cell_service || null, storedCellProvider, bathrooms || null,
        qrm_level            || null, parking || null, setup_locations || null, general_comments || null,
        antenna              || null, mode.length ? mode : null, parsedPower, bands.length ? bands : null,
        parking_availability || null, busyness || null, time_of_day || null,
        id,
      ]
    )

    const { rows: photos } = await client.query('SELECT * FROM report_photos WHERE report_id = $1', [id])
    updated.photos = photos

    await client.query('COMMIT')
    res.json(updated)
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// ── Delete a report (owner or moderator) ─────────────────────────────────────
// Mounted separately at DELETE /api/reports/:id

export const deleteReport = async (req, res, next) => {
  const client = await pool.connect()
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid report ID' })

    const { rows } = await client.query(
      'SELECT user_id FROM activation_reports WHERE id = $1', [id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Report not found' })

    const isMod   = req.user.role === 'moderator'
    const isOwner = rows[0].user_id === req.user.userId
    if (!isOwner && !isMod)
      return res.status(403).json({ error: 'You can only delete your own reports' })

    const reportOwnerId = rows[0].user_id

    const { rows: photos } = await client.query(
      'SELECT filename FROM report_photos WHERE report_id = $1', [id]
    )

    await client.query('BEGIN')
    await client.query('DELETE FROM activation_reports WHERE id = $1', [id])
    await client.query(
      'UPDATE users SET report_count = GREATEST(0, report_count - 1) WHERE id = $1',
      [reportOwnerId]
    )
    await client.query('COMMIT')

    // S3 deletes after commit — orphaned objects are harmless vs. inconsistent DB
    await Promise.allSettled(
      photos.map(p => s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: p.filename,
      })))
    )

    res.json({ deleted: id })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
}

export default router
