/**
 * Park sync script: checks POTA's park list for each state against our DB
 * and inserts only parks we don't already have. Skips full detail fetch for
 * existing parks — much faster than a full reseed.
 *
 * Run with: node src/db/seed.js
 */

import 'dotenv/config'
import path from 'path'
import pool from './pool.js'

const POTA_API = 'https://api.pota.app'
const DELAY_MS = 100

const US_LOCATIONS = [
  'US-AL', 'US-AK', 'US-AZ', 'US-AR', 'US-CA', 'US-CO', 'US-CT', 'US-DC',
  'US-DE', 'US-FL', 'US-GA', 'US-HI', 'US-ID', 'US-IL', 'US-IN', 'US-IA',
  'US-KS', 'US-KY', 'US-LA', 'US-ME', 'US-MD', 'US-MA', 'US-MI', 'US-MN',
  'US-MS', 'US-MO', 'US-MT', 'US-NE', 'US-NV', 'US-NH', 'US-NJ', 'US-NM',
  'US-NY', 'US-NC', 'US-ND', 'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI',
  'US-SC', 'US-SD', 'US-TN', 'US-TX', 'US-UT', 'US-VT', 'US-VA', 'US-WA',
  'US-WV', 'US-WI', 'US-WY', 'PR-PR',
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function insertPark(p, location) {
  await pool.query(
    `INSERT INTO parks (
      reference, name, location_desc, location_name, park_type,
      latitude, longitude, grid4, grid6, agencies, park_comments,
      access_methods, activation_methods, park_url, website,
      first_activator, first_activation_date, active,
      activations, attempts, qsos, synced_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()
    )
    ON CONFLICT (reference) DO NOTHING`,
    [
      p.reference,
      p.name                                        || null,
      location || p.locationDesc                    || null,
      p.locationName                                || null,
      p.parktypeDesc                                || null,
      p.latitude   ? parseFloat(p.latitude)         : null,
      p.longitude  ? parseFloat(p.longitude)        : null,
      p.grid4                                       || null,
      p.grid6                                       || null,
      p.agencies                                    || null,
      p.parkComments                                || null,
      p.accessMethods                               || null,
      p.activationMethods                           || null,
      p.parkURLs                                    || null,
      p.website                                     || null,
      p.firstActivator                              || null,
      p.firstActivationDate                         || null,
      p.active !== 0,
      p.activations != null ? parseInt(p.activations) : null,
      p.attempts    != null ? parseInt(p.attempts)    : null,
      p.qsos        != null ? parseInt(p.qsos)        : null,
    ]
  )
}

export async function syncNewParks() {
  console.log(`Park sync starting — ${US_LOCATIONS.length} states\n`)

  // Load all references we already have in one query
  const { rows } = await pool.query('SELECT reference FROM parks')
  const existing = new Set(rows.map(r => r.reference))
  console.log(`Existing parks in DB: ${existing.size}\n`)

  const newRefs = []

  // Step 1: fetch the list for each state and find refs we don't have
  for (const loc of US_LOCATIONS) {
    process.stdout.write(`Checking ${loc}… `)
    try {
      const r = await fetch(`${POTA_API}/location/parks/${loc}`)
      const parks = await r.json()
      if (!Array.isArray(parks)) { console.log('ERROR: unexpected response'); continue }

      const fresh = parks.filter(p => p.reference && !existing.has(p.reference))
      newRefs.push(...fresh.map(p => ({ ref: p.reference, loc })))
      console.log(`${fresh.length} new of ${parks.length}`)
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
    }
  }

  if (newRefs.length === 0) {
    console.log('\nNo new parks found. DB is up to date.')
    await pool.end()
    return
  }

  const eta = Math.round((newRefs.length * DELAY_MS) / 60000)
  console.log(`\nNew parks to fetch: ${newRefs.length} (~${eta} min at ${DELAY_MS}ms/park)`)
  console.log('Fetching full detail for new parks…\n')

  let done = 0, failed = 0

  // Step 2: fetch full detail only for new parks
  for (const { ref, loc } of newRefs) {
    try {
      const r    = await fetch(`${POTA_API}/park/${ref}`)
      const data = await r.json()
      if (!data?.reference) throw new Error('No data')
      await insertPark(data, loc)
      done++
      console.log(`  + ${ref}`)
    } catch (err) {
      failed++
      console.error(`  FAIL ${ref}: ${err.message}`)
    }
    await sleep(DELAY_MS)
  }

  console.log(`\nDone. ${done} inserted, ${failed} failed.`)
}

// Allow running directly: node src/db/seed.js
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (isMain) {
  syncNewParks()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1) })
}
