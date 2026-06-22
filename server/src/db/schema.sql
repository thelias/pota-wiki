-- PNW POTA Wiki — Database Schema

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255)  UNIQUE NOT NULL,
  callsign      VARCHAR(20)   UNIQUE NOT NULL,
  password_hash TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_callsign ON users(callsign);

-- Parks (cached from POTA API, refreshed on demand)
CREATE TABLE IF NOT EXISTS parks (
  reference             VARCHAR(20)   PRIMARY KEY,
  name                  TEXT          NOT NULL,
  location_desc         VARCHAR(20),
  location_name         TEXT,
  park_type             TEXT,
  latitude              NUMERIC(10, 7),
  longitude             NUMERIC(10, 7),
  grid4                 VARCHAR(4),
  grid6                 VARCHAR(6),
  agencies              TEXT,
  park_comments         TEXT,
  access_methods        TEXT,
  activation_methods    TEXT,
  park_url              TEXT,
  website               TEXT,
  first_activator       VARCHAR(20),
  first_activation_date DATE,
  active                BOOLEAN       DEFAULT TRUE,
  activations           INTEGER,
  attempts              INTEGER,
  qsos                  INTEGER,
  synced_at             TIMESTAMPTZ   DEFAULT now()
);

-- Migrations for existing installations
ALTER TABLE parks ADD COLUMN IF NOT EXISTS activations INTEGER;
ALTER TABLE parks ADD COLUMN IF NOT EXISTS attempts    INTEGER;
ALTER TABLE parks ADD COLUMN IF NOT EXISTS qsos        INTEGER;

-- Community activation reports
CREATE TABLE IF NOT EXISTS activation_reports (
  id               SERIAL        PRIMARY KEY,
  park_reference   VARCHAR(20)   NOT NULL REFERENCES parks(reference) ON DELETE CASCADE,
  callsign         VARCHAR(20)   NOT NULL,
  activation_date  DATE,
  cell_service     VARCHAR(10)   CHECK (cell_service IN ('yes', 'no', 'unknown')),
  bathrooms        VARCHAR(10)   CHECK (bathrooms IN ('yes', 'no', 'unknown')),
  qrm_level        VARCHAR(20)   CHECK (qrm_level IN ('very-low', 'low', 'normal', 'high', 'very-high')),
  parking          TEXT,
  setup_locations  TEXT,
  general_comments TEXT,
  cell_provider    TEXT,
  antenna          TEXT,
  mode             TEXT[],
  power_watts      INTEGER,
  user_id          UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   DEFAULT now(),
  updated_at       TIMESTAMPTZ   DEFAULT now()
);

-- Migrations for existing installations
ALTER TABLE activation_reports ADD COLUMN IF NOT EXISTS user_id       UUID    REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE activation_reports ADD COLUMN IF NOT EXISTS cell_provider TEXT;
ALTER TABLE activation_reports ADD COLUMN IF NOT EXISTS antenna       TEXT;
ALTER TABLE activation_reports ADD COLUMN IF NOT EXISTS mode          TEXT[];
ALTER TABLE activation_reports ADD COLUMN IF NOT EXISTS power_watts   INTEGER;

-- Photos attached to reports
CREATE TABLE IF NOT EXISTS report_photos (
  id            SERIAL      PRIMARY KEY,
  report_id     INTEGER     NOT NULL REFERENCES activation_reports(id) ON DELETE CASCADE,
  filename      TEXT        NOT NULL,   -- stored filename on disk
  original_name TEXT,
  mime_type     TEXT,
  size_bytes    INTEGER,
  uploaded_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_park     ON activation_reports(park_reference);
CREATE INDEX IF NOT EXISTS idx_reports_date     ON activation_reports(activation_date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_report    ON report_photos(report_id);
