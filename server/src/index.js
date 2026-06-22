import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import parksRouter from './routes/parks.js'
import reportsRouter, { deleteReport } from './routes/reports.js'
import authRouter from './routes/auth.js'
import { requireAuth } from './middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan('dev'))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

// ── Static files ─────────────────────────────────────────────────────────────
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'))
app.use('/uploads', express.static(uploadsDir))

// Serve React build in production; Vite dev server handles this in dev
const publicDir = path.resolve(__dirname, '../public')
app.use(express.static(publicDir))

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/parks', parksRouter)
app.use('/api/parks/:ref/reports', reportsRouter)
app.delete('/api/reports/:id', requireAuth, deleteReport)

// ── SPA fallback (React Router) ───────────────────────────────────────────────
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API, non-upload routes
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
  const indexPath = path.join(publicDir, 'index.html')
  res.sendFile(indexPath, err => { if (err) next() })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500
  const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  console.error(err)
  res.status(status).json({ error: message })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PNW POTA Wiki API → http://localhost:${PORT}`)
})
