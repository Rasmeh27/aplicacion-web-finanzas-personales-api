-- 202607080001_assistant_legacy_tables_safety_rename.sql
-- Archiva (RENAME, nunca DROP) la tabla LEGACY public.assistant_messages de un
-- diseño anterior del asistente, para que no colisione con la tabla nueva del
-- módulo assistant (creada por 202607060001_assistant_sessions_messages.sql).
--
-- Por qué: algunos ambientes ya tenían una tabla `assistant_messages` con
-- esquema viejo (`conversation_id`, `context_snapshot`, `model_name`,
-- `prompt_version`; FK -> `assistant_conversations`). Ningún código actual la
-- usa. Como 202607060001 usa `create table if not exists`, esa tabla legacy NO
-- se reemplaza: los INSERT del backend fallarían por columnas inexistentes y
-- los índices de 202607060001 fallarían al referenciar `session_id`. Además su
-- PK (`assistant_messages_pkey`) vive en el namespace de relaciones (los
-- índices que respaldan PK/UNIQUE comparten namespace con las tablas) e
-- impediría que el PK de la tabla nueva tome su nombre estándar.
--
-- Garantías:
--   * NO borra tablas ni filas; NO modifica datos. Solo RENAME de tabla,
--     constraints e índices. Totalmente reversible.
--   * Idempotente: ejecutarla varias veces no tiene efecto adicional.
--   * DB nueva (sin tabla legacy): no hace nada.
--   * DB ya corregida (rename manual previo): no renombra de nuevo; solo
--     normaliza nombres de constraints/índices que hayan quedado con el
--     prefijo viejo en la tabla ya archivada.
--   * La detección es por ESTRUCTURA, no solo por nombre:
--       legacy <=> existe public.assistant_messages
--                  AND tiene columna conversation_id
--                  AND NO tiene columna session_id
--   * Si existe assistant_messages pero no coincide con ninguno de los dos
--     esquemas conocidos: WARNING y no se toca (revisión manual).
--   * Si el nombre de archivo ya está ocupado, prueba sufijos _1.._20; si
--     ninguno está libre (imposible en la práctica), aborta con EXCEPTION
--     clara en lugar de dejar la colisión silenciosa.
--
-- ORDEN DE APLICACIÓN: en una DB con esquema legacy, aplicar ESTA migración
-- ANTES de 202607060001 (esa migración falla en DBs legacy porque sus índices
-- referencian session_id; si se aplicó como un solo script, habrá quedado
-- revertida por completo). Ambas son idempotentes: el orden seguro universal es
-- 202607080001 y después (re)aplicar 202607060001.
--
-- Tablas legacy relacionadas (`assistant_conversations`,
-- `assistant_audit_events`, `assistant_recommendations`,
-- `assistant_recommendation_feedback`) NO se tocan: no colisionan con el
-- módulo nuevo. El tipo enum legacy del campo `role` tampoco se toca (los
-- tipos tienen su propio namespace y la tabla nueva usa varchar). Su
-- eliminación definitiva requiere decisión explícita + backup (ver README del
-- módulo assistant, sección "Legacy assistant tables").

-- 1. Detectar por estructura y archivar la tabla legacy -----------------------
do $$
declare
  v_has_conversation_id boolean;
  v_has_session_id      boolean;
  v_base constant text := 'assistant_messages_legacy_20260707';
  v_target text;
  v_try    integer := 0;
begin
  if to_regclass('public.assistant_messages') is null then
    raise notice 'assistant_legacy_safety: public.assistant_messages no existe; nada que archivar (202607060001 creara la tabla nueva).';
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'assistant_messages'
      and column_name  = 'conversation_id'
  ) into v_has_conversation_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'assistant_messages'
      and column_name  = 'session_id'
  ) into v_has_session_id;

  if v_has_session_id then
    raise notice 'assistant_legacy_safety: public.assistant_messages ya es el esquema NUEVO (tiene session_id); nada que renombrar.';
    return;
  end if;

  if not v_has_conversation_id then
    raise warning 'assistant_legacy_safety: public.assistant_messages existe pero NO coincide ni con el esquema legacy (conversation_id) ni con el nuevo (session_id). No se toca; requiere revision manual antes de aplicar 202607060001.';
    return;
  end if;

  -- Legacy confirmada por estructura. Buscar un nombre de archivo libre
  -- (to_regclass cubre tablas, indices, vistas y secuencias: todo el
  -- namespace de relaciones).
  v_target := v_base;
  while to_regclass('public.' || v_target) is not null loop
    v_try := v_try + 1;
    if v_try > 20 then
      raise exception 'assistant_legacy_safety: no hay nombre libre para archivar public.assistant_messages (probados % .. %_20). Renombrarla manualmente y reintentar antes de aplicar 202607060001.', v_base, v_base;
    end if;
    v_target := v_base || '_' || v_try;
  end loop;

  execute format('alter table public.assistant_messages rename to %I', v_target);
  raise notice 'assistant_legacy_safety: tabla legacy archivada como public.% (solo rename; 0 filas modificadas o borradas).', v_target;
end$$;

-- 2. Normalizar constraints/índices con prefijo viejo en tablas ya archivadas -
-- Cubre tanto el rename hecho por el bloque 1 como renames manuales previos.
-- Renombrar un constraint PK/UNIQUE renombra también su índice de respaldo,
-- liberando p. ej. `assistant_messages_pkey` para la tabla nueva. Se excluye
-- contype 'n' (not-null, PG17+) porque no colisiona y no necesita rename.
do $$
declare
  t record;
  o record;
  v_new text;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'assistant\_messages\_legacy\_%'
  loop
    for o in
      select conname
      from pg_constraint
      where conrelid = ('public.' || quote_ident(t.tablename))::regclass
        and contype in ('p', 'u', 'f', 'c')
        and conname like 'assistant\_messages\_%'
        and conname not like 'assistant\_messages\_legacy\_%'
    loop
      v_new := left(t.tablename || substring(o.conname from length('assistant_messages') + 1), 63);
      execute format('alter table public.%I rename constraint %I to %I', t.tablename, o.conname, v_new);
      raise notice 'assistant_legacy_safety: constraint %.% renombrado a %', t.tablename, o.conname, v_new;
    end loop;

    for o in
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename  = t.tablename
        and indexname like 'assistant\_messages\_%'
        and indexname not like 'assistant\_messages\_legacy\_%'
    loop
      v_new := left(t.tablename || substring(o.indexname from length('assistant_messages') + 1), 63);
      execute format('alter index public.%I rename to %I', o.indexname, v_new);
      raise notice 'assistant_legacy_safety: indice % renombrado a %', o.indexname, v_new;
    end loop;
  end loop;
end$$;

-- 3. Reporte informativo (sin cambios) de tablas legacy presentes -------------
-- Estas tablas NO se renombran ni se borran en esta fase: no colisionan con el
-- módulo nuevo. Se listan para dejar rastro en los logs de migración.
do $$
declare
  t text;
  r record;
  n bigint;
begin
  foreach t in array array[
    'assistant_conversations',
    'assistant_audit_events',
    'assistant_recommendations',
    'assistant_recommendation_feedback'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      raise notice 'assistant_legacy_safety: tabla legacy public.% presente (filas: %). No la usa el AssistantModule nuevo; NO borrar sin decision explicita + backup.', t, n;
    end if;
  end loop;

  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'assistant\_messages\_legacy\_%'
  loop
    execute format('select count(*) from public.%I', r.tablename) into n;
    raise notice 'assistant_legacy_safety: archivo legacy public.% presente (filas: %).', r.tablename, n;
  end loop;
end$$;
