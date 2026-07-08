import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

import parksRouter from './routes/parks.js'
import reportsRouter, { deleteReport } from './routes/reports.js'
import authRouter from './routes/auth.js'
import { requireAuth } from './middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())

app.use(cors({
  origin: isProd ? process.env.ALLOWED_ORIGIN : true,
  credentials: true,
}))

// Auth routes: 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API: 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan(isProd ? 'combined' : 'dev'))
app.use(express.json())
app.use(cookieParser())

// ── Static files ─────────────────────────────────────────────────────────────
const publicDir = path.resolve(__dirname, '../public')
app.use(express.static(publicDir))

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/parks', apiLimiter, parksRouter)
app.use('/api/parks/:ref/reports', apiLimiter, reportsRouter)
app.delete('/api/reports/:id', apiLimiter, requireAuth, deleteReport)

// ── SPA fallback (React Router) ──────────────────────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  const indexPath = path.join(publicDir, 'index.html')
  res.sendFile(indexPath, err => { if (err) next() })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500
  const message = isProd ? 'Server error' : err.message
  console.error(err)
  res.status(status).json({ error: message })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`POTA Wiki API → http://localhost:${PORT}`)
})
