import 'dotenv/config'
import pool from './pool.js'

await pool.query(`
  CREATE TABLE IF NOT EXISTS report_votes (
    id         SERIAL PRIMARY KEY,
    user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id  INTEGER NOT NULL REFERENCES activation_reports(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, report_id)
  )
`)
console.log('✓ report_votes table created')

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_report_votes_report_id ON report_votes(report_id)
`)
console.log('✓ index on report_votes(report_id) created')

await pool.query(`
  ALTER TABLE activation_reports
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0
`)
console.log('✓ helpful_count added to activation_reports')

await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0
`)
console.log('✓ helpful_count added to users')

await pool.end()
