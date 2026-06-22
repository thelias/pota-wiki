/**
 * Activation report routes
 *
 * GET    /api/parks/:ref/reports          List all reports for a park
 * POST   /api/parks/:ref/reports          Submit a new report (requires auth)
 * DELETE /api/reports/:id                 Delete a report (owner only)
 */

import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import pool from '../db/pool.js'
import { upload } from '../middleware/upload.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

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

    // mode may arrive as a single string or array of strings from multipart form
    const rawMode = req.body.mode
    const mode = rawMode
      ? (Array.isArray(rawMode) ? rawMode : [rawMode]).filter(Boolean)
      : []

    // Callsign always comes from the authenticated user — not the request body
    const callsign = req.user.callsign

    const VALID_BOOL  = ['yes', 'no', 'unknown', undefined, null, '']
    const VALID_QRM   = ['very-low', 'low', 'normal', 'high', 'very-high', undefined, null, '']
    const VALID_MODES = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']
    if (!VALID_BOOL.includes(cell_service)) return res.status(400).json({ error: 'Invalid cell_service value' })
    if (!VALID_BOOL.includes(bathrooms))   return res.status(400).json({ error: 'Invalid bathrooms value' })
    if (!VALID_QRM.includes(qrm_level))    return res.status(400).json({ error: 'Invalid qrm_level value' })
    if (mode.some(m => !VALID_MODES.includes(m))) return res.status(400).json({ error: 'Invalid mode value' })

    const parsedPower = power_watts ? parseInt(power_watts, 10) : null

    await client.query('BEGIN')

    // only store cell_provider if cell_service was actually set
    const storedCellProvider = (cell_service === 'yes' || cell_service === 'no')
      ? (cell_provider || null)
      : null

    const { rows: [report] } = await client.query(
      `INSERT INTO activation_reports
         (park_reference, callsign, activation_date, cell_service, cell_provider, bathrooms,
          qrm_level, parking, setup_locations, general_comments, antenna, mode, power_watts, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
        mode.length ? mode : null,
        parsedPower,
        req.user.userId,
      ]
    )

    const photos = []
    if (req.files?.length) {
      for (const file of req.files) {
        const { rows: [photo] } = await client.query(
          `INSERT INTO report_photos (report_id, filename, original_name, mime_type, size_bytes)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [report.id, file.filename, file.originalname, file.mimetype, file.size]
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

    const uploadsDir = process.env.UPLOADS_DIR || './uploads'
    photos.forEach(p => fs.unlink(path.join(uploadsDir, p.filename), () => {}))

    res.json({ deleted: id })
  } catch (err) {
    next(err)
  }
}

export default router
