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
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import pool from '../db/pool.js'
import { signToken, requireAuth, COOKIE_OPTS } from '../middleware/auth.js'

const resend = new Resend(process.env.RESEND_API_KEY)

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
       RETURNING id, email, callsign, role`,
      [email.toLowerCase().trim(), callsign.toUpperCase().trim(), hash]
    )

    const user = rows[0]
    res.cookie('token', signToken({ userId: user.id, callsign: user.callsign, role: user.role }), COOKIE_OPTS)
    res.status(201).json({ id: user.id, email: user.email, callsign: user.callsign, role: user.role })
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

    res.cookie('token', signToken({ userId: user.id, callsign: user.callsign, role: user.role }), COOKIE_OPTS)
    res.json({ id: user.id, email: user.email, callsign: user.callsign, role: user.role })
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
      'SELECT id, email, callsign, report_count, role FROM users WHERE id = $1',
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
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
    const offset = (page - 1) * limit

    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM activation_reports WHERE user_id = $1', [req.user.userId]
    )
    const total      = parseInt(count)
    const totalPages = Math.ceil(total / limit) || 1

    const { rows: reports } = await pool.query(
      `SELECT r.id, r.park_reference, r.activation_date, r.callsign,
              r.cell_service, r.bathrooms, r.qrm_level,
              r.general_comments, r.created_at,
              p.name AS park_name
       FROM activation_reports r
       JOIN parks p ON p.reference = r.park_reference
       WHERE r.user_id = $1
       ORDER BY r.activation_date DESC NULLS LAST, r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    )
    res.json({ reports, total, page, totalPages, limit })
  } catch (err) {
    next(err)
  }
})

// ── Forgot password ───────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res, next) => {
  // Always respond with 200 so we don't leak whether an email exists
  try {
    const email = (req.body.email || '').toLowerCase().trim()
    if (!email) return res.json({ ok: true })

    const { rows } = await pool.query('SELECT id, callsign FROM users WHERE email = $1', [email])
    if (!rows.length) return res.json({ ok: true })

    const user  = rows[0]
    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Invalidate any existing unused tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    )
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiry]
    )

    const resetUrl = `${process.env.ALLOWED_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`

    const { data, error } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL,
      to:      email,
      subject: 'POTA Wiki — reset your password',
      html: `
        <p>Hi ${user.callsign},</p>
        <p>Click the link below to reset your POTA Wiki password. It expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore it.</p>
        <p>73,<br>POTA Wiki</p>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(502).json({ error: 'Failed to send email. Please try again.' })
    }

    console.log('Password reset email sent:', data?.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ── Reset password ────────────────────────────────────────────────────────────

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password || password.length < 8)
      return res.status(400).json({ error: 'Invalid request.' })

    const { rows } = await pool.query(
      `SELECT t.id, t.user_id FROM password_reset_tokens t
       WHERE t.token = $1
         AND t.expires_at > now()
         AND t.used_at IS NULL`,
      [token]
    )
    if (!rows.length)
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' })

    const { id: tokenId, user_id } = rows[0]
    const hash = await bcrypt.hash(password, 12)

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id])
    await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [tokenId])

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ── Top contributors ──────────────────────────────────────────────────────────

router.get('/top-contributors', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT callsign, report_count
       FROM users
       WHERE report_count > 0
       ORDER BY report_count DESC
       LIMIT 10`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// ── Public profile: reports by callsign ───────────────────────────────────────

router.get('/users/:callsign/reports', async (req, res, next) => {
  try {
    const callsign = req.params.callsign.toUpperCase().trim()
    const page     = Math.max(1, parseInt(req.query.page)  || 1)
    const limit    = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
    const offset   = (page - 1) * limit

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM activation_reports WHERE UPPER(callsign) = $1`, [callsign]
    )
    const total      = parseInt(count)
    const totalPages = Math.ceil(total / limit) || 1

    const { rows: reports } = await pool.query(
      `SELECT r.id, r.park_reference, r.activation_date, r.callsign,
              r.cell_service, r.bathrooms, r.qrm_level,
              r.general_comments, r.created_at,
              p.name AS park_name
       FROM activation_reports r
       JOIN parks p ON p.reference = r.park_reference
       WHERE UPPER(r.callsign) = $1
       ORDER BY r.activation_date DESC NULLS LAST, r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [callsign, limit, offset]
    )
    res.json({ reports, total, page, totalPages, limit })
  } catch (err) {
    next(err)
  }
})

export default router
