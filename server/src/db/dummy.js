/**
 * Dummy data script — test users + activation reports
 *
 * Run with: node src/db/dummy.js
 * Wipe with: node src/db/dummy.js --wipe
 *
 * Creates 13 test users (password: password123) and 0–15 reports per park.
 */

import 'dotenv/config'
import bcrypt from 'bcrypt'
import pool from './pool.js'

const isProd = process.env.NODE_ENV === 'production'
if(isProd) throw 'ERROR PRODUCTION'
const WIPE = process.argv.includes('--wipe')

// ── Test users ────────────────────────────────────────────────────────────────

const TEST_USERS = [
  { callsign: 'KK7KKT',  email: 'elias@test.com'       },
  { callsign: 'W7PFB',   email: 'w7test@example.com'   },
  { callsign: 'KJ7XJ',   email: 'k7demo@example.com'   },
  { callsign: 'N7FAK',   email: 'n7fake@example.com'   },
  { callsign: 'WA7DEV',  email: 'wa7dev@example.com'   },
  { callsign: 'KD7QRP',  email: 'kd7qrp@example.com'   },
  { callsign: 'W7PNW',   email: 'w7pnw@example.com'    },
  { callsign: 'KG7POA',  email: 'kg7pota@example.com'  },
  { callsign: 'N7PKS',   email: 'n7parks@example.com'  },
  { callsign: 'WB7TES',  email: 'wb7test@example.com'  },
  { callsign: 'K7ALP',   email: 'k7alpha@example.com'  },
  { callsign: 'NA7BVO',  email: 'n7bravo@example.com'  },
  { callsign: 'W7DEL',   email: 'w7delta@example.com'  },
]

// ── Sample data pools ─────────────────────────────────────────────────────────

const CELL_PROVIDERS    = [null, null, 'T-Mobile', 'Verizon', 'AT&T', 'US Cellular', 'T-Mobile', 'Verizon']
const BOOL              = ['yes', 'no', 'unknown']
const BOOL_WEIGHTED     = ['yes', 'yes', 'yes', 'no', 'no', 'unknown'] // bias toward yes/no
const QRM               = ['very-low', 'low', 'normal', 'high', 'very-high']
const QRM_WEIGHTS       = [0.15, 0.35, 0.35, 0.10, 0.05]
const ALL_MODES         = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']
const ALL_BANDS         = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m']
const POWER_OPTS        = [null, null, 5, 10, 10, 15, 20, 50, 100]
const PARKING_AVAIL     = ['good', 'good', 'okay', 'okay', 'bad', null]
const BUSYNESS          = ['quiet', 'quiet', 'moderate', 'moderate', 'busy', null]
const TIME_OF_DAY       = ['morning', 'morning', 'afternoon', 'afternoon', 'evening', null]

// Biased pools for realistic busyness patterns:
// weekends tend busier, mornings tend busier on weekends
const BUSYNESS_WEEKEND_MORNING  = ['moderate', 'busy', 'busy', 'busy', 'moderate']
const BUSYNESS_WEEKEND_OTHER    = ['moderate', 'moderate', 'busy', 'quiet']
const BUSYNESS_WEEKDAY_MORNING  = ['quiet', 'quiet', 'moderate', 'moderate']
const BUSYNESS_WEEKDAY_OTHER    = ['quiet', 'quiet', 'quiet', 'moderate']

const ANTENNAS = [
  null, null,
  'End-fed half-wave (EFHW)',
  'Vertical (Hustler 6BTV)',
  'Linked dipole',
  'Random wire with tuner',
  'Buddipole',
  'Chameleon MPAS Lite',
  'Wire dipole — 40/20m',
  'Vertical — homemade',
  'PackTenna mini EFHW',
]

const PARKING_NOTES = [
  'Very difficult parking. Small lot, maybe 6–7 cars. Trucks with trailers often take up the space. Go during non-peak hours.',
  'Large gravel lot at the trailhead, fits ~20 vehicles. Free.',
  'Small pullout on the side of the road. Room for 3–4 cars.',
  'Paved day-use lot. $10 Discover Pass required.',
  'Unmarked gravel area near the gate. No fee but limited space.',
  'Spacious parking area with an outhouse nearby. Free.',
  'Day-use lot, open sunrise to sunset. Self-pay iron ranger ($5).',
  'Street parking only — arrive early on weekends.',
  'Good-sized gravel lot with room for trailers.',
  null,
]

const SETUP_NOTES = [
  'Set up in the picnic area near the parking lot. Tables are nice but often occupied on weekends.',
  'Used the open meadow about 200m from the trailhead. Flat and clear.',
  'Deployed a vertical from the picnic shelter. Solid ground contact.',
  'Found a nice clearing off the main trail. Had to carry gear about 100m.',
  'Set up right at the car — no need to hike. Convenient.',
  'Used the boat launch area — open sky, great for wire antennas.',
  'Picnic table near the creek worked well. Good shade.',
  'Open ridge with 360° takeoff. Worth the short hike.',
  null,
]

const COMMENTS = [
  'Great activation! Plenty of space and no one bothered me.',
  'Busy on the weekend but found a quiet spot off the beaten path.',
  'Cell service was spotty — T-Mobile showed one bar.',
  'Heard some distant QRM on 40m but 20m was clean.',
  'Mosquitoes were bad in the evening. Bring bug spray.',
  'Beautiful views. Would definitely activate here again.',
  'Ran 10W SSB and made 15 contacts in about an hour.',
  'Quiet park, easy access. Recommended for new activators.',
  'Wind was strong on the ridge — bring good tent stakes for your antenna.',
  'CW only activation, very quiet RF environment.',
  'Made contacts into Europe on 17m around 1800z.',
  'Local hunters were in the area — wore orange just in case.',
  null, null, null,
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function weightedPick(arr, weights) {
  const r = Math.random()
  let sum = 0
  for (let i = 0; i < arr.length; i++) {
    sum += weights[i]
    if (r <= sum) return arr[i]
  }
  return arr[arr.length - 1]
}

function randomModes() {
  if (Math.random() < 0.3) return null
  const shuffled = [...ALL_MODES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.ceil(Math.random() * 3))
}

function randomBands() {
  if (Math.random() < 0.25) return null
  const shuffled = [...ALL_BANDS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.ceil(Math.random() * 4))
}

function randomDate() {
  const now   = Date.now()
  const three = 3 * 365 * 24 * 60 * 60 * 1000
  return new Date(now - Math.random() * three).toISOString().slice(0, 10)
}

// Pick a time of day, then derive a realistic busyness for that time + date
function randomTimeAndBusyness() {
  const tod = pick(TIME_OF_DAY)
  if (!tod) return { time_of_day: null, busyness: pick(BUSYNESS) }

  // Random date to determine weekday/weekend
  const date    = randomDate()
  const dow     = new Date(date.replace(/-/g, '/')).getDay() // 0=Sun, 6=Sat
  const weekend = dow === 0 || dow === 6

  let busyness
  if (weekend && tod === 'morning')         busyness = pick(BUSYNESS_WEEKEND_MORNING)
  else if (weekend)                          busyness = pick(BUSYNESS_WEEKEND_OTHER)
  else if (!weekend && tod === 'morning')    busyness = pick(BUSYNESS_WEEKDAY_MORNING)
  else                                       busyness = pick(BUSYNESS_WEEKDAY_OTHER)

  return { time_of_day: tod, busyness, activation_date: date }
}

// ── Wipe dummy data ───────────────────────────────────────────────────────────

async function wipe() {
  const callsigns = TEST_USERS.map(u => u.callsign)
  const { rowCount: rDel } = await pool.query(
    `DELETE FROM activation_reports WHERE callsign = ANY($1)`, [callsigns]
  )
  const { rowCount: uDel } = await pool.query(
    `DELETE FROM users WHERE callsign = ANY($1)`, [callsigns]
  )
  console.log(`Wiped ${uDel} test users and ${rDel} reports.`)
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  process.stdout.write('Hashing password… ')
  const hash = await bcrypt.hash('password123', 10)
  console.log('done')

  // Create test users
  console.log('Creating test users…')
  const users = []
  for (const u of TEST_USERS) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, callsign, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (callsign) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, callsign`,
      [u.email, u.callsign, hash]
    )
    users.push(rows[0])
    console.log(`  ✓ ${rows[0].callsign}`)
  }

  // Get all park references
  const { rows: parks } = await pool.query(
    `SELECT reference FROM parks WHERE active = TRUE ORDER BY reference`
  )
  console.log(`\nCreating reports for ${parks.length} parks…`)

  let totalReports = 0
  const BATCH = 100
  let pending  = []

  const flush = async () => {
    if (!pending.length) return
    const cols = 18
    const vals = []
    const params = []
    let i = 1
    for (const r of pending) {
      const placeholders = Array.from({ length: cols }, (_, j) => `$${i + j}`).join(',')
      vals.push(`(${placeholders})`)
      params.push(
        r.park_reference, r.callsign, r.user_id, r.activation_date,
        r.cell_service, r.cell_provider, r.bathrooms, r.qrm_level,
        r.parking, r.setup_locations, r.general_comments,
        r.antenna, r.mode, r.power_watts, r.bands,
        r.parking_availability, r.busyness, r.time_of_day,
      )
      i += cols
    }
    await pool.query(
      `INSERT INTO activation_reports
         (park_reference, callsign, user_id, activation_date,
          cell_service, cell_provider, bathrooms, qrm_level,
          parking, setup_locations, general_comments,
          antenna, mode, power_watts, bands,
          parking_availability, busyness, time_of_day)
       VALUES ${vals.join(',')}`,
      params
    )
    totalReports += pending.length
    pending = []
  }

  for (let pi = 0; pi < parks.length; pi++) {
    const parkRef    = parks[pi].reference
    const numReports = Math.floor(Math.random() * 16) // 0–15

    for (let ri = 0; ri < numReports; ri++) {
      const user        = users[Math.floor(Math.random() * users.length)]
      const cellService = pick(BOOL_WEIGHTED)
      const { time_of_day, busyness, activation_date } = randomTimeAndBusyness()

      pending.push({
        park_reference:      parkRef,
        callsign:            user.callsign,
        user_id:             user.id,
        activation_date:     activation_date || randomDate(),
        cell_service:        cellService,
        cell_provider:       (cellService === 'yes' || cellService === 'no') ? pick(CELL_PROVIDERS) : null,
        bathrooms:           pick(BOOL_WEIGHTED),
        qrm_level:           weightedPick(QRM, QRM_WEIGHTS),
        parking:             Math.random() > 0.35 ? pick(PARKING_NOTES) : null,
        setup_locations:     Math.random() > 0.35 ? pick(SETUP_NOTES)   : null,
        general_comments:    pick(COMMENTS),
        antenna:             pick(ANTENNAS),
        mode:                randomModes(),
        power_watts:         pick(POWER_OPTS),
        bands:               randomBands(),
        parking_availability: pick(PARKING_AVAIL),
        busyness,
        time_of_day,
      })
    }

    if (pending.length >= BATCH) await flush()
    if ((pi + 1) % 200 === 0) {
      console.log(`  ${pi + 1}/${parks.length} parks processed, ${totalReports + pending.length} reports queued…`)
    }
  }

  await flush()

  // Backfill report_count on users
  await pool.query(`
    UPDATE users SET report_count = (
      SELECT COUNT(*) FROM activation_reports WHERE user_id = users.id
    )
  `)
  console.log('\n✓ report_count backfilled')
  console.log(`\nDone. ${users.length} test users, ${totalReports} activation reports.`)
  console.log('Password for all test users: password123')
}

// ── Run ───────────────────────────────────────────────────────────────────────

const run = WIPE ? wipe : seed
run()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => pool.end())
