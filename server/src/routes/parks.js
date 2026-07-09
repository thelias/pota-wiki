/**
 * Parks routes
 *
 * GET  /api/parks?location=US-WA          List parks for a PNW location (cached)
 * GET  /api/parks/:ref                    Single park detail (cached)
 * POST /api/parks/:ref/sync               Force re-fetch from POTA API
 */

import { Router } from 'express'
import pool from '../db/pool.js'

const router = Router()
const POTA_API = 'https://api.pota.app'

const US_LOCATIONS = [
  'US-AL', 'US-AK', 'US-AZ', 'US-AR', 'US-CA', 'US-CO', 'US-CT', 'US-DC',
  'US-DE', 'US-FL', 'US-GA', 'US-HI', 'US-ID', 'US-IL', 'US-IN', 'US-IA',
  'US-KS', 'US-KY', 'US-LA', 'US-ME', 'US-MD', 'US-MA', 'US-MI', 'US-MN',
  'US-MS', 'US-MO', 'US-MT', 'US-NE', 'US-NV', 'US-NH', 'US-NJ', 'US-NM',
  'US-NY', 'US-NC', 'US-ND', 'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI',
  'US-SC', 'US-SD', 'US-TN', 'US-TX', 'US-UT', 'US-VT', 'US-VA', 'US-WA',
  'US-WV', 'US-WI', 'US-WY',
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function parkFromPOTA(p, location) {
  return {
    reference:             p.reference,
    name:                  p.name,
    location_desc:         location,
    location_name:         p.locationName   || null,
    park_type:             p.parktypeDesc   || null,
    latitude:              p.latitude       ? parseFloat(p.latitude)  : null,
    longitude:             p.longitude      ? parseFloat(p.longitude) : null,
    grid4:                 p.grid4          || null,
    grid6:                 p.grid6          || null,
    agencies:              p.agencies       || null,
    park_comments:         p.parkComments   || null,
    access_methods:        p.accessMethods  || null,
    activation_methods:    p.activationMethods || null,
    park_url:              p.parkURLs       || null,
    website:               p.website        || null,
    first_activator:       p.firstActivator || null,
    first_activation_date: p.firstActivationDate || null,
    active:                p.active !== 0,
    activations:           p.activations != null ? parseInt(p.activations) : null,
    attempts:              p.attempts    != null ? parseInt(p.attempts)    : null,
    qsos:                  p.qsos        != null ? parseInt(p.qsos)        : null,
  }
}

// Only update stats + active status — preserves all detail fields already in DB
async function upsertParkStats(p, location) {
  await pool.query(
    `INSERT INTO parks (reference, name, location_desc, active, activations, attempts, qsos, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (reference) DO UPDATE SET
       active      = EXCLUDED.active,
       activations = EXCLUDED.activations,
       attempts    = EXCLUDED.attempts,
       qsos        = EXCLUDED.qsos,
       synced_at   = now()`,
    [
      p.reference,
      p.name,
      location,
      p.active !== 0,
      p.activations != null ? parseInt(p.activations) : null,
      p.attempts    != null ? parseInt(p.attempts)    : null,
      p.qsos        != null ? parseInt(p.qsos)        : null,
    ]
  )
}

async function upsertPark(park) {
  const { rows } = await pool.query(
    `INSERT INTO parks (
      reference, name, location_desc, location_name, park_type,
      latitude, longitude, grid4, grid6, agencies, park_comments,
      access_methods, activation_methods, park_url, website,
      first_activator, first_activation_date, active,
      activations, attempts, qsos, synced_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()
    )
    ON CONFLICT (reference) DO UPDATE SET
      name                  = EXCLUDED.name,
      location_desc         = EXCLUDED.location_desc,
      location_name         = EXCLUDED.location_name,
      park_type             = EXCLUDED.park_type,
      latitude              = EXCLUDED.latitude,
      longitude             = EXCLUDED.longitude,
      grid4                 = EXCLUDED.grid4,
      grid6                 = EXCLUDED.grid6,
      agencies              = EXCLUDED.agencies,
      park_comments         = EXCLUDED.park_comments,
      access_methods        = EXCLUDED.access_methods,
      activation_methods    = EXCLUDED.activation_methods,
      park_url              = EXCLUDED.park_url,
      website               = EXCLUDED.website,
      first_activator       = EXCLUDED.first_activator,
      first_activation_date = EXCLUDED.first_activation_date,
      active                = EXCLUDED.active,
      activations           = EXCLUDED.activations,
      attempts              = EXCLUDED.attempts,
      qsos                  = EXCLUDED.qsos,
      synced_at             = now()
    RETURNING *`,
    [
      park.reference, park.name, park.location_desc, park.location_name,
      park.park_type, park.latitude, park.longitude, park.grid4, park.grid6,
      park.agencies, park.park_comments, park.access_methods,
      park.activation_methods, park.park_url, park.website,
      park.first_activator, park.first_activation_date, park.active,
      park.activations, park.attempts, park.qsos,
    ]
  )
  return rows[0]
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/parks
 * Server-side filtered, paginated park list.
 *
 * Query params:
 *   search  – name/reference ILIKE search
 *   state   – location_desc filter (e.g. US-WA)
 *   page    – 1-based page number (default 1)
 *   limit   – results per page (default 20, max 100)
 *   lat/lng – if provided, sorts by distance instead of name
 */
router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim()
    const state  = (req.query.state  || '').trim().toUpperCase()
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const offset = (page - 1) * limit
    const lat    = req.query.lat != null ? parseFloat(req.query.lat) : null
    const lng    = req.query.lng != null ? parseFloat(req.query.lng) : null

    // Build WHERE conditions dynamically
    const conditions = ['p.active = TRUE']
    const countParams = []

    if (search) {
      countParams.push(`%${search}%`)
      conditions.push(`(p.name ILIKE $${countParams.length} OR p.reference ILIKE $${countParams.length})`)
    }
    if (state) {
      countParams.push(state)
      conditions.push(`p.location_desc = $${countParams.length}`)
    }

    const where = conditions.join(' AND ')

    // Total count for pagination
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM parks p WHERE ${where}`,
      countParams
    )
    const total      = parseInt(count)
    const totalPages = Math.ceil(total / limit) || 1

    // Data query — report counts pre-aggregated to avoid GROUP BY on all park cols
    const dataParams = [...countParams]
    let orderBy
    if (lat != null && lng != null) {
      dataParams.push(lat, lng)
      const pLat = dataParams.length - 1
      const pLng = dataParams.length
      orderBy = `(p.latitude::float - $${pLat})^2 + (p.longitude::float - $${pLng})^2 ASC NULLS LAST`
    } else {
      orderBy = 'p.name ASC'
    }
    dataParams.push(limit, offset)
    const pLimit  = dataParams.length - 1
    const pOffset = dataParams.length

    const { rows: parks } = await pool.query(
      `SELECT p.*, COALESCE(rc.cnt, 0)::int AS report_count
       FROM parks p
       LEFT JOIN (
         SELECT park_reference, COUNT(*)::int AS cnt
         FROM activation_reports
         GROUP BY park_reference
       ) rc ON rc.park_reference = p.reference
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${pLimit} OFFSET $${pOffset}`,
      dataParams
    )

    res.json({ parks, total, page, totalPages, limit })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/parks/:ref
 * Returns a single park. Fetches from POTA if not cached yet.
 */
router.get('/:ref', async (req, res, next) => {
  try {
    const ref = req.params.ref.toUpperCase()
    const { rows } = await pool.query('SELECT * FROM parks WHERE reference = $1', [ref])

    if (rows.length) return res.json(rows[0])

    // Not in DB yet — fetch from POTA
    const potaRes = await fetch(`${POTA_API}/park/${ref}`)
    const park = await potaRes.json()
    if (!park || !park.reference) return res.status(404).json({ error: 'Park not found' })

    const saved = await upsertPark(parkFromPOTA(park, park.locationDesc))
    res.json(saved)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/parks/sync-all
 * Force re-fetch ALL parks for every PNW location from POTA API.
 * Heavy — run once. Streams progress as newline-delimited JSON.
 */
router.post('/sync-all', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.flushHeaders()

  const send = (obj) => res.write(JSON.stringify(obj) + '\n')

  let totalUpserted = 0
  for (const loc of US_LOCATIONS) {
    send({ status: 'fetching', location: loc })
    try {
      const r = await fetch(`${POTA_API}/location/parks/${loc}`)
      const parks = await r.json()
      if (!Array.isArray(parks)) { send({ status: 'error', location: loc, msg: 'Unexpected response' }); continue }

      let count = 0
      for (const p of parks) {
        if (!p.reference) continue
        try { await upsertParkStats(p, loc); count++ } catch { /* skip */ }
      }
      totalUpserted += count
      send({ status: 'done', location: loc, count })
    } catch (err) {
      send({ status: 'error', location: loc, msg: err.message })
    }
  }
  send({ status: 'complete', total: totalUpserted })
  res.end()
})

/**
 * POST /api/parks/:ref/sync
 * Force re-fetch a single park from POTA API.
 */
router.post('/:ref/sync', async (req, res, next) => {
  try {
    const ref = req.params.ref.toUpperCase()
    const potaRes = await fetch(`${POTA_API}/park/${ref}`)
    const park = await potaRes.json()
    if (!park || !park.reference) return res.status(404).json({ error: 'Park not found on POTA' })
    const saved = await upsertPark(parkFromPOTA(park, park.locationDesc))
    res.json(saved)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/parks/:ref/summary
 * Aggregated stats from all activation reports for a park.
 */
router.get('/:ref/summary', async (req, res, next) => {
  try {
    const ref = req.params.ref.toUpperCase()

    // Main aggregation
    const { rows: [s] } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,

        -- Cell service (exclude 'unknown' from denominator)
        COUNT(*) FILTER (WHERE cell_service = 'yes')::int          AS cell_yes,
        COUNT(*) FILTER (WHERE cell_service = 'no')::int           AS cell_no,
        COUNT(*) FILTER (WHERE cell_service IN ('yes','no'))::int   AS cell_total,

        -- Bathrooms
        COUNT(*) FILTER (WHERE bathrooms = 'yes')::int             AS bath_yes,
        COUNT(*) FILTER (WHERE bathrooms = 'no')::int              AS bath_no,
        COUNT(*) FILTER (WHERE bathrooms IN ('yes','no'))::int      AS bath_total,

        -- QRM (numeric 1–5)
        MIN(CASE qrm_level
          WHEN 'very-low' THEN 1 WHEN 'low' THEN 2 WHEN 'normal' THEN 3
          WHEN 'high' THEN 4 WHEN 'very-high' THEN 5 END)          AS qrm_min,
        MAX(CASE qrm_level
          WHEN 'very-low' THEN 1 WHEN 'low' THEN 2 WHEN 'normal' THEN 3
          WHEN 'high' THEN 4 WHEN 'very-high' THEN 5 END)          AS qrm_max,
        ROUND(AVG(CASE qrm_level
          WHEN 'very-low' THEN 1 WHEN 'low' THEN 2 WHEN 'normal' THEN 3
          WHEN 'high' THEN 4 WHEN 'very-high' THEN 5 END), 1)      AS qrm_avg,
        COUNT(*) FILTER (WHERE qrm_level IS NOT NULL)::int         AS qrm_total,

        -- Parking availability
        COUNT(*) FILTER (WHERE parking_availability = 'good')::int AS parking_good,
        COUNT(*) FILTER (WHERE parking_availability = 'okay')::int AS parking_okay,
        COUNT(*) FILTER (WHERE parking_availability = 'bad')::int  AS parking_bad,
        COUNT(*) FILTER (WHERE parking_availability IS NOT NULL)::int AS parking_total

      FROM activation_reports
      WHERE park_reference = $1
    `, [ref])

    // Busyness patterns — grouped by weekday/weekend × time of day
    const { rows: patterns } = await pool.query(`
      SELECT
        CASE WHEN EXTRACT(DOW FROM activation_date) IN (0, 6)
          THEN 'weekend' ELSE 'weekday' END                        AS day_type,
        time_of_day,
        ROUND(AVG(CASE busyness
          WHEN 'quiet' THEN 1 WHEN 'moderate' THEN 2 WHEN 'busy' THEN 3
          END), 2)                                                  AS avg_busyness,
        COUNT(*)::int                                              AS sample_size
      FROM activation_reports
      WHERE park_reference = $1
        AND busyness IS NOT NULL
        AND time_of_day IS NOT NULL
        AND activation_date IS NOT NULL
      GROUP BY day_type, time_of_day
      HAVING COUNT(*) >= 2
      ORDER BY day_type, time_of_day
    `, [ref])

    res.json({ ...s, patterns })
  } catch (err) {
    next(err)
  }
})

// ── Seed helper ──────────────────────────────────────────────────────────────

async function seedLocations(locations = US_LOCATIONS) {
  for (const loc of locations) {
    try {
      const r = await fetch(`${POTA_API}/location/parks/${loc}`)
      const parks = await r.json()
      if (!Array.isArray(parks)) continue
      for (const p of parks) {
        if (!p.reference) continue
        await upsertParkStats(p, loc).catch(() => {})
      }
      console.log(`  Seeded ${parks.length} parks for ${loc}`)
    } catch (err) {
      console.error(`  Failed to seed ${loc}:`, err.message)
    }
  }
}

export default router
