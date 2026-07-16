import { Router } from 'express'
import pool from '../db/pool.js'
import { requireMod } from '../middleware/auth.js'

const router = Router()
const LIMIT = 20

/**
 * GET /api/admin/stats
 * Overall totals.
 */
router.get('/stats', requireMod, async (req, res, next) => {
  try {
    const [{ rows: [{ count: users }] }, { rows: [{ count: reports }] }] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM activation_reports'),
    ])
    res.json({ users: parseInt(users), reports: parseInt(reports) })
  } catch (err) {
    next(err)
  }
})

function dateClause(from, to, alias = '') {
  const col = alias ? `${alias}.created_at` : 'created_at'
  if (from && to)  return { clause: `${col}::date BETWEEN $1::date AND $2::date`, params: [from, to] }
  if (from)        return { clause: `${col}::date >= $1::date`,                   params: [from] }
  if (to)          return { clause: `${col}::date <= $1::date`,                   params: [to] }
  return           { clause: `${col}::date = CURRENT_DATE`,                       params: [] }
}

/**
 * GET /api/admin/signups?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1
 */
router.get('/signups', requireMod, async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const offset = (page - 1) * LIMIT
    const { clause, params } = dateClause(req.query.from, req.query.to)

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM users WHERE ${clause}`, params
    )
    const total      = parseInt(count)
    const totalPages = Math.ceil(total / LIMIT) || 1

    const { rows: items } = await pool.query(
      `SELECT id, callsign, email, created_at AS ts
       FROM users
       WHERE ${clause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, LIMIT, offset]
    )

    res.json({ items, total, page, totalPages })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1
 */
router.get('/reports', requireMod, async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const offset = (page - 1) * LIMIT
    const { clause, params } = dateClause(req.query.from, req.query.to, 'ar')

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM activation_reports ar WHERE ${clause}`, params
    )
    const total      = parseInt(count)
    const totalPages = Math.ceil(total / LIMIT) || 1

    const { rows: items } = await pool.query(
      `SELECT ar.id, ar.park_reference, ar.activation_date, ar.created_at AS ts,
              u.callsign, p.name AS park_name
       FROM activation_reports ar
       JOIN users u ON u.id = ar.user_id
       LEFT JOIN parks p ON p.reference = ar.park_reference
       WHERE ${clause}
       ORDER BY ar.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, LIMIT, offset]
    )

    res.json({ items, total, page, totalPages })
  } catch (err) {
    next(err)
  }
})

export default router
