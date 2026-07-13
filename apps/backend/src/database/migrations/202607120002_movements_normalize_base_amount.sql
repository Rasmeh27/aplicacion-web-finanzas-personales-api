-- Normaliza los montos de movimientos a la moneda base del usuario (DOP).
--
-- Contexto: el frontend suma el campo `amount` en crudo e ignora `currency`, así
-- que un ingreso en USD se contaba a valor nominal (2,400) en el panel. Para que
-- todo lo que lee `amount` quede correcto sin depender del frontend, `amount`
-- pasa a guardar el valor YA convertido a la moneda base y se preserva lo que el
-- usuario ingresó en original_amount / original_currency.
--
-- Usa el `amount_base`/`base_currency` calculados por 202607120001. Esas columnas
-- se dejan (dormidas) para no romper el código viejo durante el despliegue; se
-- pueden eliminar en una migración posterior.

alter table if exists public.movements
  add column if not exists original_amount numeric(14, 2),
  add column if not exists original_currency varchar(3);

-- 1) Preserva lo ingresado por el usuario (idempotente: solo la primera vez).
update public.movements
set original_amount = amount,
    original_currency = currency
where original_amount is null;

-- 2) `amount`/`currency` pasan a la moneda base (para filas en DOP es idéntico).
update public.movements
set amount = amount_base,
    currency = coalesce(base_currency, 'DOP')
where amount_base is not null
  and (amount is distinct from amount_base
       or currency is distinct from coalesce(base_currency, 'DOP'));
