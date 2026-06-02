const bcrypt = require("bcrypt");
const db = require("../services/db");

module.exports = async function initTables() {
  await db.query(`
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
  `);

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS name VARCHAR(120) NOT NULL DEFAULT 'CCA Member',
      ADD COLUMN IF NOT EXISTS username VARCHAR(80),
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'Member',
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'Pending Verification',
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS password_reset_code_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(40) NOT NULL DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  await db.query(`
    UPDATE users
    SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
    WHERE username IS NULL;
  `);

  await db.query(`
    WITH ranked_users AS (
      SELECT
        id,
        username,
        ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY id) AS duplicate_rank
      FROM users
      WHERE username IS NOT NULL
    )
    UPDATE users
    SET username = users.username || users.id
    FROM ranked_users
    WHERE users.id = ranked_users.id
      AND ranked_users.duplicate_rank > 1;
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
    ON users (username)
    WHERE username IS NOT NULL;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
      ) THEN
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
      END IF;
    END $$;
  `);

  await db.query(`
    DROP TABLE IF EXISTS user_roles;
    DROP TABLE IF EXISTS roles;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS venues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) UNIQUE NOT NULL,
      address TEXT,
      capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      registration_deadline DATE,
      venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      status VARCHAR(30) NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Open', 'Completed', 'Cancelled')),
      requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'venue'
      ) THEN
        ALTER TABLE events ALTER COLUMN venue DROP NOT NULL;
      END IF;
    END $$;
  `);

  await db.query(`
    INSERT INTO venues (name)
    SELECT DISTINCT venue
    FROM events
    WHERE venue IS NOT NULL
    ON CONFLICT (name) DO NOTHING;
  `).catch((error) => {
    if (error.code !== "42703") {
      throw error;
    }
  });

  await db.query(`
    UPDATE events
    SET venue_id = venues.id
    FROM venues
    WHERE events.venue_id IS NULL
      AND events.venue = venues.name;
  `).catch((error) => {
    if (error.code !== "42703") {
      throw error;
    }
  });

  await db.query(`
    ALTER TABLE events
      ALTER COLUMN status SET DEFAULT 'Draft';
  `);

  await db.query(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await db.query(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await db.query(`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS registration_deadline DATE;
  `);

  await db.query(`
    UPDATE events
    SET registration_deadline = event_date
    WHERE registration_deadline IS NULL;
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_reactions (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction_type VARCHAR(30) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_id, user_id)
    );
  `);

  await db.query(`
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'Activity',
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      competition_id INTEGER,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT notifications_single_activity CHECK (
        event_id IS NULL OR competition_id IS NULL
      )
    );
  `);

  await db.query(`
    ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS competition_id INTEGER;
  `);

  await db.query(`
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_single_activity
      CHECK (event_id IS NULL OR competition_id IS NULL);
  `).catch((error) => {
    if (error.code !== "42710") {
      throw error;
    }
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance_change_requests (
      id SERIAL PRIMARY KEY,
      event_registration_id INTEGER,
      competition_registration_id INTEGER,
      requested_attended BOOLEAN NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT attendance_change_requests_exact_registration CHECK (
        (event_registration_id IS NOT NULL AND competition_registration_id IS NULL)
        OR
        (event_registration_id IS NULL AND competition_registration_id IS NOT NULL)
      )
    );
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS attendance_change_requests_event_one_pending
    ON attendance_change_requests (event_registration_id)
    WHERE status = 'Pending' AND event_registration_id IS NOT NULL;
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS attendance_change_requests_competition_one_pending
    ON attendance_change_requests (competition_registration_id)
    WHERE status = 'Pending' AND competition_registration_id IS NOT NULL;
  `);

  await db.query(`
    ALTER TABLE attendance_change_requests
      DROP CONSTRAINT IF EXISTS attendance_change_requests_exact_activity_fk;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance_change_requests' AND column_name = 'activity_type'
      ) THEN
        ALTER TABLE attendance_change_requests ALTER COLUMN activity_type DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance_change_requests' AND column_name = 'registration_id'
      ) THEN
        ALTER TABLE attendance_change_requests ALTER COLUMN registration_id DROP NOT NULL;
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS venues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) UNIQUE NOT NULL,
      address TEXT,
      capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tournament_formats (
      id SERIAL PRIMARY KEY,
      name VARCHAR(80) UNIQUE NOT NULL,
      description TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS scoring_systems (
      id SERIAL PRIMARY KEY,
      name VARCHAR(80) UNIQUE NOT NULL,
      win_points INTEGER NOT NULL DEFAULT 1,
      loss_points INTEGER NOT NULL DEFAULT 0,
      description TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS player_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      school VARCHAR(160),
      date_of_birth DATE,
      rank_type VARCHAR(20) CHECK (rank_type IS NULL OR rank_type IN ('Kyu', 'Dan', 'Unrated')),
      rank_value INTEGER CHECK (rank_value IS NULL OR rank_value >= 0),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
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
  `);

  await db.query(`
    ALTER TABLE competitions
      ADD COLUMN IF NOT EXISTS schedule_text TEXT,
      ADD COLUMN IF NOT EXISTS awards_text TEXT,
      ADD COLUMN IF NOT EXISTS eligibility_text TEXT,
      ADD COLUMN IF NOT EXISTS registration_method TEXT,
      ADD COLUMN IF NOT EXISTS registration_deadline DATE,
      ADD COLUMN IF NOT EXISTS time_control TEXT,
      ADD COLUMN IF NOT EXISTS late_policy TEXT,
      ADD COLUMN IF NOT EXISTS arbiter_policy TEXT,
      ADD COLUMN IF NOT EXISTS rules_text TEXT;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_categories (
      id SERIAL PRIMARY KEY,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      registration_fee NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
      min_age INTEGER CHECK (min_age IS NULL OR min_age >= 0),
      max_age INTEGER CHECK (max_age IS NULL OR max_age >= 0),
      rank_type VARCHAR(20) CHECK (rank_type IS NULL OR rank_type IN ('Kyu', 'Dan', 'Unrated')),
      min_rank_value INTEGER CHECK (min_rank_value IS NULL OR min_rank_value >= 0),
      max_rank_value INTEGER CHECK (max_rank_value IS NULL OR max_rank_value >= 0),
      UNIQUE (competition_id, name)
    );
  `);

  await db.query(`
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_registrations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending Approval'
        CHECK (status IN ('Pending Approval', 'Registered', 'Waitlisted', 'Rejected', 'Withdrawn')),
      attended BOOLEAN NOT NULL DEFAULT FALSE,
      seed_number INTEGER,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, category_id)
    );
  `);

  await db.query(`
    ALTER TABLE competition_registrations
      ADD COLUMN IF NOT EXISTS attended BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await db.query(`
    ALTER TABLE competition_registrations
      ADD COLUMN IF NOT EXISTS initial_mms NUMERIC(5, 2) NOT NULL DEFAULT 10;
  `);

  await db.query(`
    ALTER TABLE attendance_change_requests
      ADD CONSTRAINT attendance_change_requests_event_registration_fk
      FOREIGN KEY (event_registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE;
  `).catch((error) => {
    if (error.code !== "42710") {
      throw error;
    }
  });

  await db.query(`
    ALTER TABLE attendance_change_requests
      ADD CONSTRAINT attendance_change_requests_competition_registration_fk
      FOREIGN KEY (competition_registration_id) REFERENCES competition_registrations(id) ON DELETE CASCADE;
  `).catch((error) => {
    if (error.code !== "42710") {
      throw error;
    }
  });

  await db.query(`
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
  `);

  await db.query(`
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
        CHECK (result IN ('Scheduled', 'Black Win', 'White Win', 'Bye', 'Forfeit Black', 'Forfeit White')),
      winner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    ALTER TABLE competition_categories
      ADD COLUMN IF NOT EXISTS rank_type VARCHAR(20)
      CHECK (rank_type IS NULL OR rank_type IN ('Kyu', 'Dan', 'Unrated'));
  `);

  await db.query(`
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_competition_fk
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE;
  `).catch((error) => {
    if (error.code !== "42710") {
      throw error;
    }
  });

  await db.query(`
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
      byes INTEGER NOT NULL DEFAULT 0,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (competition_id, category_id, user_id, round_number)
    );
  `);

  await db.query(`
    ALTER TABLE competition_ranking_records
      ADD COLUMN IF NOT EXISTS byes INTEGER NOT NULL DEFAULT 0;
  `);

  await db.query(`
    DROP TABLE IF EXISTS registration_form_answers;
    DROP TABLE IF EXISTS registration_form_fields;
  `);

  await db.query(`
    DROP TABLE IF EXISTS match_players;
    DROP TABLE IF EXISTS matches;
    DROP TABLE IF EXISTS rankings;
  `);


  const passwordHash = await bcrypt.hash("admin123", 10);

  await db.query(
    `
      INSERT INTO users (name, username, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, $4, 'Captain', 'Active', TRUE)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash),
        username = EXCLUDED.username,
        role = 'Captain',
        status = 'Active',
        email_verified = TRUE;
    `,
    ["CCA Captain", "captain", "admin@example.com", passwordHash]
  );

  await db.query(`
    INSERT INTO venues (name, address, capacity)
    VALUES
      ('SWA Training Hall', 'Singapore Weiqi Association', 64),
      ('CCA Room 2', 'Campus clubhouse', 24),
      ('Library Hub', 'Level 2 study area', 32)
    ON CONFLICT (name) DO NOTHING;
  `);

  await db.query(`
    INSERT INTO tournament_formats (name, description)
    VALUES
      ('Swiss', 'Players with similar scores are paired across multiple rounds.'),
      ('Round Robin', 'Every participant plays every other participant.'),
      ('Knockout', 'Single-elimination bracket format.')
    ON CONFLICT (name) DO NOTHING;
  `);

  await db.query(`
    INSERT INTO scoring_systems (name, win_points, loss_points, description)
    VALUES
      ('Standard Win/Loss', 1, 0, 'One point for a win, zero for a loss.'),
      ('League Points', 3, 0, 'Three points for a win, zero for a loss.')
    ON CONFLICT (name) DO NOTHING;
  `);

  await db.query(`
    WITH defaults AS (
      SELECT
        (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1) AS organizer_id,
        (SELECT id FROM venues WHERE name = 'SWA Training Hall' LIMIT 1) AS venue_id
    )
    INSERT INTO competitions (
      title,
      description,
      organizer_id,
      venue_id,
      start_date,
      end_date,
      status,
      schedule_text,
      awards_text,
      eligibility_text,
      registration_method,
      registration_deadline,
      time_control,
      late_policy,
      arbiter_policy,
      rules_text
    )
    SELECT
      'TourneyHub Invitational',
      'Seed competition for testing categories, registration approval, signup tracking and attendance.',
      organizer_id,
      venue_id,
      '2026-06-15'::date,
      '2026-06-16'::date,
      'Open',
      '15 - 16 June 2026, 1000 - 1630 on both days',
      'Medals for top performers and certificates for participants.',
      'Open to CCA members. Categories may include age, rank, or school team eligibility.',
      'Register through TourneysHub using your member account.',
      '2026-06-08'::date,
      '25 minutes plus 10 seconds increment from Move 1.',
      'Players late by 15 minutes may forfeit the round.',
      'The captain or appointed arbiter will make the final decision for disputes.',
      'Final name list will be checked after the registration deadline. Organizers may amend rules if needed.'
    FROM defaults
    WHERE NOT EXISTS (SELECT 1 FROM competitions);
  `);

  await db.query(`
    WITH competition AS (
      SELECT id FROM competitions WHERE title = 'TourneyHub Invitational' LIMIT 1
    )
    INSERT INTO competition_categories (competition_id, name, capacity, registration_fee, min_age, max_age)
    SELECT id, 'Open Division', 32, 0, NULL, NULL FROM competition
    UNION ALL
    SELECT id, 'Junior Division', 24, 0, 7, 18 FROM competition
    ON CONFLICT (competition_id, name) DO NOTHING;
  `);

  await db.query(`
    WITH competition AS (
      SELECT id FROM competitions WHERE title = 'TourneyHub Invitational' LIMIT 1
    )
    INSERT INTO competition_settings (
      competition_id,
      tournament_format_id,
      scoring_system_id,
      registration_opens_at,
      registration_closes_at,
      requires_approval,
      allow_waitlist,
      round_count
    )
    SELECT
      competition.id,
      (SELECT id FROM tournament_formats WHERE name = 'Swiss' LIMIT 1),
      (SELECT id FROM scoring_systems WHERE name = 'Standard Win/Loss' LIMIT 1),
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '21 days',
      TRUE,
      TRUE,
      5
    FROM competition
    ON CONFLICT (competition_id) DO NOTHING;
  `);

  await db.query(`
    UPDATE competitions
    SET
      description = CASE
        WHEN description ILIKE '%matches and ranking%' THEN 'Seed competition for testing categories, registration approval, signup tracking and attendance.'
        ELSE description
      END,
      schedule_text = COALESCE(schedule_text, '15 - 16 June 2026, 1000 - 1630 on both days'),
      awards_text = COALESCE(awards_text, 'Medals for top performers and certificates for participants.'),
      eligibility_text = COALESCE(eligibility_text, 'Open to CCA members. Categories may include age, rank, or school team eligibility.'),
      registration_method = COALESCE(registration_method, 'Register through TourneysHub using your member account.'),
      registration_deadline = COALESCE(registration_deadline, '2026-06-08'::date),
      time_control = COALESCE(time_control, '25 minutes plus 10 seconds increment from Move 1.'),
      late_policy = 'Any player who is late by 15 minutes will automatically lose the game.',
      arbiter_policy = 'For any dispute, the Chief Arbiter will make the final decision.',
      rules_text = 'The official name list will be put up for final checking after the registration deadline. There will be no changing of the name list on the actual day of competition. The organizers reserve the rights to amend the rules as stated above.'
    WHERE title = 'TourneyHub Invitational';
  `);

  await db.query(`
    INSERT INTO events (title, description, event_date, registration_deadline, venue_id, capacity, status)
    SELECT seed.title, seed.description, seed.event_date, seed.registration_deadline, venues.id, seed.capacity, seed.status
    FROM (VALUES
      ('Weekly Weiqi Training', 'Regular practice session for all skill levels.', '2026-05-15'::date, '2026-05-13'::date, 'CCA Room 2', 24, 'Open'),
      ('Beginner Strategy Clinic', 'Small-group clinic for new members.', '2026-05-18'::date, '2026-05-16'::date, 'Library Hub', 16, 'Open'),
      ('Friendly Match Day', 'Casual internal games and review.', '2026-05-23'::date, '2026-05-21'::date, 'SWA Training Hall', 32, 'Open')
    ) AS seed(title, description, event_date, registration_deadline, venue_name, capacity, status)
    JOIN venues ON venues.name = seed.venue_name
    WHERE NOT EXISTS (SELECT 1 FROM events);
  `);
};
