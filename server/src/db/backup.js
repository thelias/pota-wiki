/**
 * Local JSON backup/restore for the PNW POTA database.
 *
 * Export:  node src/db/backup.js export [--dir ./backup]
 * Restore: node src/db/backup.js restore [--dir ./backup]
 *
 * Tables backed up: parks, users, activation_reports, report_photos
 * Files written:    <dir>/parks.json, users.json, reports.json, photos.json
 */

import 'dotenv/config'
import fs   from 'fs/promises'
import path from 'path'
import pool from './pool.js'

// ── CLI args ─────────────────────────────────────────────────────────────────

const [,, command, ...flags] = process.argv
const dirFlag = flags.indexOf('--dir')
const BACKUP_DIR = dirFlag >= 0 ? flags[dirFlag + 1] : path.resolve('backup')

if (!['export', 'restore'].includes(command)) {
  console.error('Usage: node src/db/backup.js <export|restore> [--dir ./backup]')
  process.exit(1)
}

// ── Export ───────────────────────────────────────────────────────────────────

async function doExport() {
  await fs.mkdir(BACKUP_DIR, { recursive: true })

  const tables = [
    { file: 'parks.json',   query: 'SELECT * FROM parks   ORDER BY reference'          },
    { file: 'users.json',   query: 'SELECT * FROM users   ORDER BY id'                 },
    { file: 'reports.json', query: 'SELECT * FROM activation_reports ORDER BY id'      },
    { file: 'photos.json',  query: 'SELECT * FROM report_photos      ORDER BY id'      },
  ]

  for (const { file, query } of tables) {
    const { rows } = await pool.query(query)
    const dest = path.join(BACKUP_DIR, file)
    await fs.writeFile(dest, JSON.stringify(rows, null, 2))
    console.log(`  ✓ ${file.padEnd(14)} ${rows.length} rows → ${dest}`)
  }

  // Write a manifest
  const manifest = { exported_at: new Date().toISOString(), dir: BACKUP_DIR }
  await fs.writeFile(path.join(BACKUP_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\nBackup complete → ${BACKUP_DIR}`)
}

// ── Restore ──────────────────────────────────────────────────────────────────

async function doRestore() {
  // Check backup dir exists
  try { await fs.access(BACKUP_DIR) }
  catch { console.error(`Backup dir not found: ${BACKUP_DIR}`); process.exit(1) }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Restore in FK-safe order: parks → users → reports → photos
    await restoreTable(client, path.join(BACKUP_DIR, 'parks.json'),   restorePark)
    await restoreTable(client, path.join(BACKUP_DIR, 'users.json'),   restoreUser)
    await restoreTable(client, path.join(BACKUP_DIR, 'reports.json'), restoreReport)
    await restoreTable(client, path.join(BACKUP_DIR, 'photos.json'),  restorePhoto)

    // Reset sequences so new inserts don't collide
    await client.query(`SELECT setval('users_id_seq',              COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)`)
    await client.query(`SELECT setval('activation_reports_id_seq', COALESCE((SELECT MAX(id) FROM activation_reports), 0) + 1, false)`)
    await client.query(`SELECT setval('report_photos_id_seq',      COALESCE((SELECT MAX(id) FROM report_photos), 0) + 1, false)`)

    await client.query('COMMIT')
    console.log('\nRestore complete.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function restoreTable(client, file, fn) {
  let rows
  try {
    rows = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    console.log(`  ⚠ Skipping ${path.basename(file)} (not found)`)
    return
  }

  let done = 0
  for (const row of rows) {
    try { await fn(client, row); done++ }
    catch (err) { console.error(`  FAIL ${JSON.stringify(row).slice(0, 80)}: ${err.message}`) }
  }
  console.log(`  ✓ ${path.basename(file).padEnd(14)} ${done}/${rows.length} rows restored`)
}

// ── Per-table upserts ─────────────────────────────────────────────────────────

function restorePark(client, p) {
  return client.query(
    `INSERT INTO parks (
      reference, name, location_desc, location_name, park_type,
      latitude, longitude, grid4, grid6, agencies, park_comments,
      access_methods, activation_methods, park_url, website,
      first_activator, first_activation_date, active,
      activations, attempts, qsos, synced_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    ON CONFLICT (reference) DO UPDATE SET
      name = EXCLUDED.name, location_desc = EXCLUDED.location_desc,
      location_name = EXCLUDED.location_name, park_type = EXCLUDED.park_type,
      latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
      grid4 = EXCLUDED.grid4, grid6 = EXCLUDED.grid6,
      agencies = EXCLUDED.agencies, park_comments = EXCLUDED.park_comments,
      access_methods = EXCLUDED.access_methods, activation_methods = EXCLUDED.activation_methods,
      park_url = EXCLUDED.park_url, website = EXCLUDED.website,
      first_activator = EXCLUDED.first_activator, first_activation_date = EXCLUDED.first_activation_date,
      active = EXCLUDED.active, activations = EXCLUDED.activations,
      attempts = EXCLUDED.attempts, qsos = EXCLUDED.qsos, synced_at = EXCLUDED.synced_at`,
    [
      p.reference, p.name, p.location_desc, p.location_name, p.park_type,
      p.latitude, p.longitude, p.grid4, p.grid6, p.agencies, p.park_comments,
      p.access_methods, p.activation_methods, p.park_url, p.website,
      p.first_activator, p.first_activation_date, p.active,
      p.activations, p.attempts, p.qsos, p.synced_at,
    ]
  )
}

function restoreUser(client, u) {
  // id is a UUID — restore it exactly so report user_id FK references still resolve
  return client.query(
    `INSERT INTO users (id, email, callsign, password_hash, created_at)
     VALUES ($1::uuid,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email, callsign = EXCLUDED.callsign,
       password_hash = EXCLUDED.password_hash, created_at = EXCLUDED.created_at`,
    [u.id, u.email, u.callsign, u.password_hash, u.created_at]
  )
}

function restoreReport(client, r) {
  return client.query(
    `INSERT INTO activation_reports
       (id, park_reference, callsign, activation_date, cell_service, cell_provider, bathrooms,
        qrm_level, parking, setup_locations, general_comments, antenna, mode, power_watts,
        user_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (id) DO UPDATE SET
       park_reference = EXCLUDED.park_reference, callsign = EXCLUDED.callsign,
       activation_date = EXCLUDED.activation_date, cell_service = EXCLUDED.cell_service,
       cell_provider = EXCLUDED.cell_provider, bathrooms = EXCLUDED.bathrooms,
       qrm_level = EXCLUDED.qrm_level, parking = EXCLUDED.parking,
       setup_locations = EXCLUDED.setup_locations, general_comments = EXCLUDED.general_comments,
       antenna = EXCLUDED.antenna, mode = EXCLUDED.mode,
       power_watts = EXCLUDED.power_watts, user_id = EXCLUDED.user_id,
       updated_at = EXCLUDED.updated_at`,
    [
      r.id, r.park_reference, r.callsign, r.activation_date,
      r.cell_service, r.cell_provider ?? null,
      r.bathrooms, r.qrm_level, r.parking, r.setup_locations, r.general_comments,
      r.antenna ?? null, r.mode || null, r.power_watts ?? null,
      r.user_id, r.created_at, r.updated_at,
    ]
  )
}

function restorePhoto(client, p) {
  return client.query(
    `INSERT INTO report_photos (id, report_id, filename, original_name, mime_type, size_bytes, uploaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       report_id = EXCLUDED.report_id, filename = EXCLUDED.filename,
       original_name = EXCLUDED.original_name, mime_type = EXCLUDED.mime_type,
       size_bytes = EXCLUDED.size_bytes, uploaded_at = EXCLUDED.uploaded_at`,
    [p.id, p.report_id, p.filename, p.original_name, p.mime_type, p.size_bytes, p.uploaded_at]
  )
}

// ── Run ──────────────────────────────────────────────────────────────────────

const run = command === 'export' ? doExport : doRestore
run()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => pool.end())
