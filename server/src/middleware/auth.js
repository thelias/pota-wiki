import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.token
  if (token) {
    try { req.user = jwt.verify(token, SECRET) } catch {}
  }
  next()
}

export function requireMod(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    req.user = jwt.verify(token, SECRET)
    if (req.user.role !== 'moderator') return res.status(403).json({ error: 'Forbidden' })
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
}
