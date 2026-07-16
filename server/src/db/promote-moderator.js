import 'dotenv/config'
import pool from './pool.js'

const callsign = process.argv[2]?.toUpperCase().trim()
if (!callsign) {
  console.error('Usage: node src/db/promote-moderator.js <CALLSIGN>')
  process.exit(1)
}

const { rowCount } = await pool.query(
  `UPDATE users SET role = 'moderator' WHERE callsign = $1`,
  [callsign]
)

if (rowCount === 0) {
  console.error(`✗ No user found with callsign ${callsign}`)
  process.exit(1)
}

console.log(`✓ ${callsign} promoted to moderator`)
await pool.end()
