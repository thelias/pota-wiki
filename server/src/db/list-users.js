import pool from './pool.js'

const { rows } = await pool.query(
  `SELECT id, callsign, email, report_count, created_at
   FROM users
   ORDER BY created_at ASC`
)

console.log(`\n${'#'.padEnd(5)} ${'Callsign'.padEnd(12)} ${'Email'.padEnd(30)} ${'Reports'.padEnd(9)} Created`)
console.log('-'.repeat(80))
rows.forEach((u, i) => {
  console.log(
    `${String(i + 1).padEnd(5)} ${u.callsign.padEnd(12)} ${u.email.padEnd(30)} ${String(u.report_count ?? 0).padEnd(9)} ${new Date(u.created_at).toLocaleDateString()}`
  )
})
console.log(`\n${rows.length} user${rows.length !== 1 ? 's' : ''} total\n`)

await pool.end()
