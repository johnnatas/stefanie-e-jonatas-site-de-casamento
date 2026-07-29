alter table gifts
  add column if not exists infinite_pay_order_nsu text,
  add column if not exists infinite_pay_checkout_url text;

alter table gift_contributions
  add column if not exists guest_phone text,
  add column if not exists payment_provider text not null default 'mercado_pago'
    check (payment_provider in ('mercado_pago', 'infinite_pay')),
  add column if not exists infinite_pay_order_nsu text,
  add column if not exists infinite_pay_transaction_nsu text;

alter table admin_security_settings
  add column if not exists active_payment_provider text not null default 'mercado_pago'
    check (active_payment_provider in ('mercado_pago', 'infinite_pay')),
  add column if not exists infinitepay_handle text;
