alter table guests
  add column if not exists confirmed_at timestamptz;

-- Backfill: guests already confirmed before this column existed get their
-- created_at as an approximate confirmation date, so sorting/filtering by
-- confirmed_at never has to special-case "no value yet" for existing data.
update guests
  set confirmed_at = created_at
  where attendance_status = 'confirmed' and confirmed_at is null;
