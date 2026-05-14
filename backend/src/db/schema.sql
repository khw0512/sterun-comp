CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  role         VARCHAR(20) NOT NULL CHECK (role IN ('club_manager', 'guest')),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clubs (
  id          SERIAL PRIMARY KEY,
  manager_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  location    VARCHAR(255),
  image_url   VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  club_id     INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  event_date  TIMESTAMP NOT NULL,
  location    VARCHAR(255) NOT NULL,
  max_guests  INTEGER DEFAULT 20,
  languages   TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 기존 DB에 컬럼 추가할 때:
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS languages TEXT;

CREATE TABLE IF NOT EXISTS registrations (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
  guest_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  attended   BOOLEAN DEFAULT FALSE,
  message    TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (event_id, guest_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  registration_id INTEGER REFERENCES registrations(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_club_id ON events(club_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_guest_id ON registrations(guest_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
