/**
 * Standalone runner for the park sync.
 * Use this to manually trigger a sync:
 *   node src/db/run-seed.js
 *
 * This is intentionally separate from seed.js so importing seed.js
 * as a module (e.g. by the cron) never has side effects.
 */

import 'dotenv/config'
import pool from './pool.js'
import { syncNewParks } from './seed.js'

syncNewParks()
  .then(() => {
    console.log('Sync complete.')
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => pool.end())
