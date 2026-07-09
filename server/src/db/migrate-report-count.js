import 'dotenv/config'
import pool from './pool.js'

await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0
`)
console.log('✓ report_count column added')

// Backfill from existing reports
await pool.query(`
  UPDATE users u
  SET report_count = (
    SELECT COUNT(*) FROM activation_reports WHERE user_id = u.id
  )
`)
console.log('✓ report_count backfilled')

await pool.end()
