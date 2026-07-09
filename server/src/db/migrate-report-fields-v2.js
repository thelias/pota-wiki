import 'dotenv/config'
import pool from './pool.js'

await pool.query(`
  ALTER TABLE activation_reports
    ADD COLUMN IF NOT EXISTS parking_availability TEXT,
    ADD COLUMN IF NOT EXISTS busyness             TEXT,
    ADD COLUMN IF NOT EXISTS time_of_day          TEXT
`)
console.log('✓ parking_availability, busyness, time_of_day columns added')
await pool.end()
