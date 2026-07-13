-- Conversión de moneda en movimientos.
-- Cada movimiento guarda el monto convertido a la moneda base del usuario
-- (amount_base) junto con la tasa aplicada (exchange_rate) y la moneda base
-- (base_currency). Los reportes suman siempre amount_base, de modo que un
-- ingreso/gasto en USD se refleja en RD$ y no se suma "en crudo".
--
-- Tasas BCRD usadas para el backfill (RD$ por 1 USD):
--   compra 58.36 -> ingresos en USD
--   venta  58.95 -> gastos en USD
-- Para movimientos históricos no existe la tasa del día en que ocurrieron, así
-- que se usa la tasa vigente como mejor estimación.

alter table if exists public.movements
  add column if not exists exchange_rate numeric(18, 6) not null default 1,
  add column if not exists amount_base numeric(14, 2),
  add column if not exists base_currency varchar(3) not null default 'DOP';

-- Backfill de la tasa aplicada según moneda y tipo del movimiento.
update public.movements
set exchange_rate = case
    when upper(coalesce(currency, 'DOP')) = 'DOP' then 1
    when upper(currency) = 'USD' and type = 'income' then 58.36
    when upper(currency) = 'USD' and type = 'expense' then 58.95
    else 1
  end
where amount_base is null;

-- Monto convertido a la moneda base (RD$).
update public.movements
set amount_base = round(amount * exchange_rate, 2)
where amount_base is null;
