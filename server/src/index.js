import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

import cron from 'node-cron'
import parksRouter, { listParks } from './routes/parks.js'
import { syncNewParks } from './db/seed.js'
import reportsRouter, { deleteReport, editReport, voteReport } from './routes/reports.js'
import authRouter, { userParks } from './routes/auth.js'
import adminRouter from './routes/admin.js'
import { requireAuth } from './middleware/auth.js'
import { upload } from './middleware/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

app.set('trust proxy', 1)

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'frame-src': ["'self'", 'https://www.openstreetmap.org'],
      'img-src':   ["'self'", 'data:', 'blob:', 'https://*.amazonaws.com', 'https://www.openstreetmap.org', 'https://*.tile.openstreetmap.org'],
    },
  },
}))

// Credentialed requests (auth cookies) — locked to own origin in prod
app.use(cors({
  origin: isProd ? process.env.ALLOWED_ORIGIN : true,
  credentials: true,
}))

// Public API routes — open to any origin, no credentials needed
const openCors = cors({ origin: '*' })
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: () => !isProd,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/parks/list', openCors, publicApiLimiter)
app.use('/api/:callsign/parks', openCors, publicApiLimiter)

// Auth routes: 60 requests per 15 minutes per IP
// (covers /me on every page load, profile fetches, check-callsign, etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: () => !isProd,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API: 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skip: () => !isProd,
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
app.get('/api/parks/list', apiLimiter, listParks)
app.get('/api/:callsign/parks', apiLimiter, userParks)
app.use('/api/admin', apiLimiter, adminRouter)
app.use('/api/parks', apiLimiter, parksRouter)
app.use('/api/parks/:ref/reports', apiLimiter, reportsRouter)
app.put('/api/reports/:id', apiLimiter, requireAuth, upload.array('photos', 4), editReport)
app.delete('/api/reports/:id', apiLimiter, requireAuth, deleteReport)
app.post('/api/reports/:id/vote', apiLimiter, requireAuth, voteReport)

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

// ── Scheduled jobs ────────────────────────────────────────────────────────────
// Sync parks from POTA API nightly at 3am
if (isProd) {
  cron.schedule('0 3 * * *', () => syncNewParks().catch(console.error))
  console.log('[cron] Park sync scheduled for 3am daily')
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`POTA Wiki API → http://localhost:${PORT}`)
})
