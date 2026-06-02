CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL DEFAULT 'CCA Member',
  username VARCHAR(80),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(30) NOT NULL DEFAULT 'Member'
    CHECK (role IN ('Captain', 'Vice-Captain', 'Secretary', 'Member')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending Verification',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,
  password_reset_code_hash VARCHAR(255),
  password_reset_expires TIMESTAMP,
  auth_provider VARCHAR(40) NOT NULL DEFAULT 'local',
  provider_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
ON users (username)
WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(40) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_registration_update BOOLEAN NOT NULL DEFAULT TRUE,
  notify_event_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  notify_attendance_marked BOOLEAN NOT NULL DEFAULT FALSE,
  default_requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  default_event_capacity INTEGER NOT NULL DEFAULT 20 CHECK (default_event_capacity > 0),
  default_competition_venue VARCHAR(160),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school VARCHAR(160),
  date_of_birth DATE,
  rank_type VARCHAR(20) CHECK (rank_type IS NULL OR rank_type IN ('Kyu', 'Dan', 'Unrated')),
  rank_value INTEGER CHECK (rank_value IS NULL OR rank_value >= 0),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) UNIQUE NOT NULL,
  address TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  registration_deadline DATE,
  venue VARCHAR(160) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Open', 'Completed', 'Cancelled')),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'Registered'
    CHECK (status IN ('Pending Approval', 'Registered', 'Rejected', 'Withdrawn')),
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS event_comments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_reactions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_formats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS scoring_systems (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL,
  win_points INTEGER NOT NULL DEFAULT 1,
  draw_points INTEGER NOT NULL DEFAULT 0,
  loss_points INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Open', 'In Progress', 'Completed', 'Cancelled')),
  schedule_text TEXT,
  awards_text TEXT,
  eligibility_text TEXT,
  registration_method TEXT,
  registration_deadline DATE,
  time_control TEXT,
  late_policy TEXT,
  arbiter_policy TEXT,
  rules_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competition_categories (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  registration_fee NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
  min_age INTEGER CHECK (min_age IS NULL OR min_age >= 0),
  max_age INTEGER CHECK (max_age IS NULL OR max_age >= 0),
  min_rank_value INTEGER CHECK (min_rank_value IS NULL OR min_rank_value >= 0),
  max_rank_value INTEGER CHECK (max_rank_value IS NULL OR max_rank_value >= 0),
  UNIQUE (competition_id, name)
);

CREATE TABLE IF NOT EXISTS competition_settings (
  competition_id INTEGER PRIMARY KEY REFERENCES competitions(id) ON DELETE CASCADE,
  tournament_format_id INTEGER REFERENCES tournament_formats(id) ON DELETE SET NULL,
  scoring_system_id INTEGER REFERENCES scoring_systems(id) ON DELETE SET NULL,
  registration_opens_at TIMESTAMP,
  registration_closes_at TIMESTAMP,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  allow_waitlist BOOLEAN NOT NULL DEFAULT TRUE,
  round_count INTEGER NOT NULL DEFAULT 5 CHECK (round_count > 0)
);

CREATE TABLE IF NOT EXISTS competition_registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending Approval'
    CHECK (status IN ('Pending Approval', 'Registered', 'Waitlisted', 'Rejected', 'Withdrawn')),
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  seed_number INTEGER,
  initial_mms NUMERIC(5, 2) NOT NULL DEFAULT 10,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS attendance_change_requests (
  id SERIAL PRIMARY KEY,
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('Event', 'Competition')),
  event_registration_id INTEGER REFERENCES event_registrations(id) ON DELETE CASCADE,
  competition_registration_id INTEGER REFERENCES competition_registrations(id) ON DELETE CASCADE,
  requested_attended BOOLEAN NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT attendance_change_requests_exact_activity_fk CHECK (
    (activity_type = 'Event' AND event_registration_id IS NOT NULL AND competition_registration_id IS NULL)
    OR
    (activity_type = 'Competition' AND event_registration_id IS NULL AND competition_registration_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_change_requests_event_one_pending
ON attendance_change_requests (event_registration_id)
WHERE status = 'Pending' AND event_registration_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_change_requests_competition_one_pending
ON attendance_change_requests (competition_registration_id)
WHERE status = 'Pending' AND competition_registration_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'Activity',
  activity_type VARCHAR(40),
  activity_id INTEGER,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competition_rounds (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'Pairing Generated'
    CHECK (status IN ('Pairing Generated', 'In Progress', 'Completed')),
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (category_id, round_number)
);

CREATE TABLE IF NOT EXISTS competition_matches (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
  round_id INTEGER NOT NULL REFERENCES competition_rounds(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  black_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  white_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  handicap INTEGER NOT NULL DEFAULT 0 CHECK (handicap >= 0),
  result VARCHAR(30) NOT NULL DEFAULT 'Scheduled'
    CHECK (result IN ('Scheduled', 'Black Win', 'White Win', 'Draw', 'Bye', 'Forfeit Black', 'Forfeit White')),
  winner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competition_ranking_records (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  rank_position INTEGER NOT NULL,
  mms NUMERIC(6, 2) NOT NULL DEFAULT 0,
  sos NUMERIC(6, 2) NOT NULL DEFAULT 0,
  sosos NUMERIC(6, 2) NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (competition_id, category_id, user_id, round_number)
);

DROP TABLE IF EXISTS registration_form_answers;
DROP TABLE IF EXISTS registration_form_fields;
DROP TABLE IF EXISTS match_players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS rankings;
