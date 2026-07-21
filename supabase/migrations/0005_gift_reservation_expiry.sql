alter table gifts
  add column reserved_until timestamptz null;

alter table gift_contributions
  add column expected_payment_date timestamptz null;

alter table gift_contributions
  drop constraint gift_contributions_status_check;

alter table gift_contributions
  add constraint gift_contributions_status_check
  check (status in ('pending', 'approved', 'rejected', 'expired'));

update gifts
  set status = 'available'
  where status = 'reserved';
