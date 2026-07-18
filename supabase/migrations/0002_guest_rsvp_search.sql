-- Moves the RSVP flow from open self-registration to a pre-registered
-- guest list searched by name: guests now start as 'pending' (created by
-- the couple via /admin/convidados/novo) and are updated to
-- 'confirmed'/'declined' by the guest themselves on /confirmar-presenca.

alter table guests
  add column if not exists nickname text;

alter table guests
  add column if not exists attendance_status text;

update guests
  set attendance_status = case when attendance_confirmed then 'confirmed' else 'declined' end
  where attendance_status is null;

alter table guests
  alter column attendance_status set default 'pending';

alter table guests
  alter column attendance_status set not null;

alter table guests
  add constraint guests_attendance_status_check
  check (attendance_status in ('pending', 'confirmed', 'declined'));

alter table guests
  alter column email drop not null;

alter table guests
  alter column phone drop not null;

alter table guests
  drop column attendance_confirmed;
