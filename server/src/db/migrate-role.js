import 'dotenv/config'
import pool from './pool.js'

await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'moderator'))
`)
console.log('✓ role column added to users')

await pool.end()
