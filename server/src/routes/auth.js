/**
 * Auth routes
 *
 * POST /api/auth/signup   Create account
 * POST /api/auth/login    Log in
 * POST /api/auth/logout   Clear session cookie
 * GET  /api/auth/me       Current user (requires auth)
 */

import { Router } from 'express'
import bcrypt from 'bcrypt'
import pool from '../db/pool.js'
import { signToken, requireAuth, COOKIE_OPTS } from '../middleware/auth.js'

const router = Router()

// ── Sign up ──────────────────────────────────────────────────────────────────

router.post('/signup', async (req, res, next) => {
  try {
    const { email, callsign, password } = req.body

    if (!email?.trim() || !callsign?.trim() || !password)
      return res.status(400).json({ error: 'email, callsign, and password are required' })

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Validate callsign against POTA
    const csUp = callsign.toUpperCase().trim()
    try {
      const potaRes = await fetch(`https://api.pota.app/profile/${csUp}`)
      if (!potaRes.ok) {
        return res.status(400).json({ error: `Callsign ${csUp} was not found on POTA. You must have a POTA account to register.` })
      }
      const profile = await potaRes.json()
      if (!profile?.callsign) {
        return res.status(400).json({ error: `Callsign ${csUp} was not found on POTA. You must have a POTA account to register.` })
      }
    } catch {
      return res.status(503).json({ error: 'Could not reach POTA to verify your callsign. Please try again.' })
    }

    const hash = await bcrypt.hash(password, 12)

    const { rows } = await pool.query(
      `INSERT INTO users (email, callsign, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, callsign`,
      [email.toLowerCase().trim(), callsign.toUpperCase().trim(), hash]
    )

    const user = rows[0]
    res.cookie('token', signToken({ userId: user.id, callsign: user.callsign }), COOKIE_OPTS)
    res.status(201).json({ id: user.id, email: user.email, callsign: user.callsign })
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail?.includes('email') ? 'email' : 'callsign'
      return res.status(409).json({ error: `That ${field} is already registered` })
    }
    next(err)
  }
})

// ── Check callsign ───────────────────────────────────────────────────────────

router.get('/check-callsign', async (req, res) => {
  const cs = (req.query.callsign || '').toUpperCase().trim()
  if (!cs) return res.status(400).json({ error: 'callsign required' })
  try {
    const potaRes = await fetch(`https://api.pota.app/profile/${cs}`)
    if (!potaRes.ok) return res.status(404).json({ found: false })
    const profile = await potaRes.json()
    if (!profile?.callsign) return res.status(404).json({ found: false })
    res.json({ found: true, callsign: profile.callsign, name: profile.name })
  } catch {
    res.status(503).json({ error: 'Could not reach POTA' })
  }
})

// ── Log in ───────────────────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { callsign, password } = req.body

    if (!callsign?.trim() || !password)
      return res.status(400).json({ error: 'callsign and password are required' })

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE callsign = $1',
      [callsign.toUpperCase().trim()]
    )

    const user = rows[0]
    const valid = user && await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid callsign or password' })

    res.cookie('token', signToken({ userId: user.id, callsign: user.callsign }), COOKIE_OPTS)
    res.json({ id: user.id, email: user.email, callsign: user.callsign })
  } catch (err) {
    next(err)
  }
})

// ── Log out ──────────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

// ── Current user ─────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, callsign FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// ── My reports ────────────────────────────────────────────────────────────────

router.get('/my-reports', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.park_reference, r.activation_date, r.callsign,
              r.cell_service, r.bathrooms, r.qrm_level,
              r.general_comments, r.created_at,
              p.name AS park_name
       FROM activation_reports r
       JOIN parks p ON p.reference = r.park_reference
       WHERE r.user_id = $1
       ORDER BY r.activation_date DESC NULLS LAST, r.created_at DESC`,
      [req.user.userId]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

export default router
