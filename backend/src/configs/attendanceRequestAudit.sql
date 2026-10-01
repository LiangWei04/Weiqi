-- Additive upgrade for existing request rows. Apply before serving the new API.
BEGIN;
ALTER TABLE attendance_change_requests
  ADD COLUMN IF NOT EXISTS replaces_request_id INTEGER REFERENCES attendance_change_requests(id),
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP;

ALTER TABLE attendance_change_requests
  DROP CONSTRAINT IF EXISTS attendance_change_requests_status_check;
ALTER TABLE attendance_change_requests
  ADD CONSTRAINT attendance_change_requests_status_check
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Superseded'));

CREATE UNIQUE INDEX IF NOT EXISTS attendance_change_requests_one_replacement
ON attendance_change_requests (replaces_request_id)
WHERE replaces_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION preserve_attendance_request_audit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Attendance requests are audit records and cannot be deleted'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status <> 'Pending' OR
     ROW(NEW.id, NEW.event_registration_id, NEW.competition_registration_id,
         NEW.requested_attended, NEW.reason, NEW.requested_by, NEW.created_at,
         NEW.replaces_request_id)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.event_registration_id, OLD.competition_registration_id,
         OLD.requested_attended, OLD.reason, OLD.requested_by, OLD.created_at,
         OLD.replaces_request_id) THEN
    RAISE EXCEPTION 'Submitted attendance request content and finalized decisions are immutable'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status IN ('Approved', 'Rejected') AND NEW.reviewed_by IS NOT NULL
     AND NEW.reviewed_at IS NOT NULL AND NEW.superseded_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'Superseded' AND NEW.superseded_at IS NOT NULL
     AND NEW.reviewed_by IS NULL AND NEW.reviewed_at IS NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid attendance request transition' USING ERRCODE = '23514';
END;
$$;

CREATE OR REPLACE TRIGGER attendance_request_preserve_audit
BEFORE UPDATE OR DELETE ON attendance_change_requests
FOR EACH ROW EXECUTE FUNCTION preserve_attendance_request_audit();
COMMIT;
