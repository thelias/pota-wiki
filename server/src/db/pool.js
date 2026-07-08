import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('rds.amazonaws.com')
    ? { rejectUnauthorized: false }
    : false,
})

pool.on('error', (err) => {
  console.error('Unexpected DB error:', err)
})

export default pool
