/**
 * Full US seed script: fetches full park detail for every park in all 50 states.
 * Run with: node src/db/seed.js
 *
 * Strategy:
 *   1. Pull all park references from the location endpoint per state (fast bulk list)
 *   2. For each ref, fetch /park/:ref (full detail) and upsert into DB
 *   3. 100ms delay between requests to be polite to the POTA API
 *
 * Expected runtime: ~34 minutes for ~20,000 parks.
 * Safe to re-run — all inserts are upserts.
 */

import 'dotenv/config'
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
  'US-WV', 'US-WI', 'US-WY',
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function parkFromPOTA(p, location) {
  return {
    reference:             p.reference,
    name:                  p.name,
    location_desc:         location || p.locationDesc || null,
    location_name:         p.locationName         || null,
    park_type:             p.parktypeDesc         || null,
    latitude:              p.latitude             ? parseFloat(p.latitude)  : null,
    longitude:             p.longitude            ? parseFloat(p.longitude) : null,
    grid4:                 p.grid4                || null,
    grid6:                 p.grid6                || null,
    agencies:              p.agencies             || null,
    park_comments:         p.parkComments         || null,
    access_methods:        p.accessMethods        || null,
    activation_methods:    p.activationMethods    || null,
    park_url:              p.parkURLs             || null,
    website:               p.website              || null,
    first_activator:       p.firstActivator       || null,
    first_activation_date: p.firstActivationDate  || null,
    active:                p.active !== 0,
    activations:           p.activations != null  ? parseInt(p.activations) : null,
    attempts:              p.attempts    != null  ? parseInt(p.attempts)    : null,
    qsos:                  p.qsos        != null  ? parseInt(p.qsos)        : null,
  }
}

async function upsertPark(park) {
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
    ON CONFLICT (reference) DO UPDATE SET
      name                  = EXCLUDED.name,
      location_desc         = EXCLUDED.location_desc,
      location_name         = EXCLUDED.location_name,
      park_type             = EXCLUDED.park_type,
      latitude              = EXCLUDED.latitude,
      longitude             = EXCLUDED.longitude,
      grid4                 = EXCLUDED.grid4,
      grid6                 = EXCLUDED.grid6,
      agencies              = EXCLUDED.agencies,
      park_comments         = EXCLUDED.park_comments,
      access_methods        = EXCLUDED.access_methods,
      activation_methods    = EXCLUDED.activation_methods,
      park_url              = EXCLUDED.park_url,
      website               = EXCLUDED.website,
      first_activator       = EXCLUDED.first_activator,
      first_activation_date = EXCLUDED.first_activation_date,
      active                = EXCLUDED.active,
      activations           = EXCLUDED.activations,
      attempts              = EXCLUDED.attempts,
      qsos                  = EXCLUDED.qsos,
      synced_at             = now()`,
    [
      park.reference, park.name, park.location_desc, park.location_name,
      park.park_type, park.latitude, park.longitude, park.grid4, park.grid6,
      park.agencies, park.park_comments, park.access_methods,
      park.activation_methods, park.park_url, park.website,
      park.first_activator, park.first_activation_date, park.active,
      park.activations, park.attempts, park.qsos,
    ]
  )
}

async function main() {
  console.log(`US POTA seed script starting — ${US_LOCATIONS.length} states\n`)

  // Step 1: collect all refs per state
  const allRefs = []
  for (const loc of US_LOCATIONS) {
    process.stdout.write(`Fetching park list for ${loc}… `)
    try {
      const r = await fetch(`${POTA_API}/location/parks/${loc}`)
      const parks = await r.json()
      if (!Array.isArray(parks)) { console.log('ERROR: unexpected response'); continue }
      const refs = parks.filter(p => p.reference).map(p => ({ ref: p.reference, loc }))
      allRefs.push(...refs)
      console.log(`${refs.length} parks`)
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
    }
  }

  const eta = Math.round((allRefs.length * DELAY_MS) / 60000)
  console.log(`\nTotal parks to seed: ${allRefs.length} (~${eta} min at ${DELAY_MS}ms/park)`)
  console.log('Fetching full detail for each park…\n')

  let done = 0, failed = 0
  const total = allRefs.length

  for (const { ref, loc } of allRefs) {
    try {
      const r    = await fetch(`${POTA_API}/park/${ref}`)
      const data = await r.json()
      if (!data || !data.reference) throw new Error('No data')
      await upsertPark(parkFromPOTA(data, loc))
      done++
    } catch (err) {
      failed++
      console.error(`  FAIL ${ref}: ${err.message}`)
    }

    // Progress every 50 parks
    if ((done + failed) % 50 === 0) {
      const pct = (((done + failed) / total) * 100).toFixed(1)
      console.log(`  ${done + failed}/${total} (${pct}%) — ${failed} failed`)
    }

    await sleep(DELAY_MS)
  }

  console.log(`\nDone. ${done} upserted, ${failed} failed.`)
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
