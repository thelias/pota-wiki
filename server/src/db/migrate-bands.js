/**
 * Migration: add bands column to activation_reports
 * Run with: node src/db/migrate-bands.js
 */

import 'dotenv/config'
import pool from './pool.js'

await pool.query(`ALTER TABLE activation_reports ADD COLUMN IF NOT EXISTS bands TEXT[]`)

const { rows } = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'activation_reports' AND column_name = 'bands'
`)

const added = rows.length > 0
console.log(added ? '✓ bands column ready' : '! bands column not found — check DB connection')
await pool.end()
