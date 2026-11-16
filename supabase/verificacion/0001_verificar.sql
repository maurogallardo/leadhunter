-- =====================================================================
-- LeadHunter - Verificación de la migración 0001
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. No muestra datos de negocios.
-- Es una sola consulta (el SQL Editor de Supabase muestra solo el
-- resultado de la última), y devuelve una fila por chequeo:
--   chequeo | detalle | ok
-- La última fila ("RESUMEN") dice si todo dio bien.
-- =====================================================================

with tablas(nombre) as (
  values ('rubros'), ('zonas'), ('leads'), ('cola_busquedas'), ('corridas')
),
roles(rol) as (
  values ('anon'), ('authenticated'), ('service_role'), ('public')
),

-- (a) Las 5 tablas existen
a as (
  select
    'a) existe tabla ' || t.nombre as chequeo,
    case when to_regclass('public.' || t.nombre) is not null then 'existe' else 'NO EXISTE' end as detalle,
    to_regclass('public.' || t.nombre) is not null as ok
  from tablas t
),

-- (b) RLS activo en cada tabla
b as (
  select
    'b) RLS en ' || t.nombre as chequeo,
    case when cl.relrowsecurity then 'activado' else 'DESACTIVADO' end as detalle,
    coalesce(cl.relrowsecurity, false) as ok
  from tablas t
  left join pg_class cl on cl.oid = to_regclass('public.' || t.nombre)
),

-- (c) Políticas existentes (deben ser 4 por tabla, todas "to authenticated")
c as (
  select
    'c) politica ' || p.tablename || ' / ' || p.cmd as chequeo,
    p.policyname || ' -> roles: ' || array_to_string(p.roles, ', ') as detalle,
    p.roles = array['authenticated']::name[] as ok
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (select nombre from tablas)
),
c_total as (
  select
    'c) total de politicas' as chequeo,
    count(*)::text || ' (esperado: 20)' as detalle,
    count(*) = 20 as ok
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (select nombre from tablas)
),

-- (d) Qué permisos tiene cada rol sobre cada tabla
--     anon y public: ninguno. authenticated y service_role: los 4 básicos.
d as (
  select
    'd) permisos ' || r.rol || ' en ' || t.nombre as chequeo,
    coalesce(nullif(string_agg(g.privilege_type, ', ' order by g.privilege_type), ''), 'ninguno') as detalle,
    case
      when r.rol in ('anon', 'public')
        then count(g.privilege_type) = 0
      else coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type) = 'DELETE, INSERT, SELECT, UPDATE', false)
    end as ok
  from tablas t
  cross join roles r
  left join pg_class cl on cl.oid = to_regclass('public.' || t.nombre)
  left join lateral (
    select x.privilege_type
    from aclexplode(cl.relacl) x
    where x.grantee = case when r.rol = 'public' then 0::oid else (select oid from pg_roles where rolname = r.rol) end
  ) g on true
  group by t.nombre, r.rol
),

-- (d bis) Permiso efectivo de anon (incluye lo heredado): debe ser "no"
d_anon as (
  select
    'd) anon puede leer/escribir ' || t.nombre as chequeo,
    case when has_table_privilege('anon', 'public.' || t.nombre, 'select, insert, update, delete')
         then 'SI (MAL)' else 'no' end as detalle,
    not has_table_privilege('anon', 'public.' || t.nombre, 'select, insert, update, delete') as ok
  from tablas t
  where to_regclass('public.' || t.nombre) is not null
),

-- (d bis) La función del trigger no la puede ejecutar anon
d_func as (
  select
    'd) anon puede ejecutar fijar_actualizado_en()' as chequeo,
    case
      when to_regprocedure('public.fijar_actualizado_en()') is null then 'LA FUNCION NO EXISTE'
      when has_function_privilege('anon', 'public.fijar_actualizado_en()', 'execute') then 'SI (MAL)'
      else 'no'
    end as detalle,
    case
      when to_regprocedure('public.fijar_actualizado_en()') is null then false
      else not has_function_privilege('anon', 'public.fijar_actualizado_en()', 'execute')
    end as ok
),

-- (e) rubros tiene 7 filas
e as (
  select
    'e) filas en rubros' as chequeo,
    count(*)::text || ' (esperado: 7)' as detalle,
    count(*) = 7 as ok
  from public.rubros
),

todo as (
  select 1 as orden, * from a
  union all select 2, * from b
  union all select 3, * from c
  union all select 4, * from c_total
  union all select 5, * from d
  union all select 6, * from d_anon
  union all select 7, * from d_func
  union all select 8, * from e
)

select chequeo, detalle, ok
from (
  select orden, chequeo, detalle, ok from todo
  union all
  select
    99,
    'RESUMEN',
    case when bool_and(ok) then 'TODO OK' else 'HAY ' || count(*) filter (where not ok) || ' CHEQUEO(S) MAL' end,
    bool_and(ok)
  from todo
) resultado
order by orden, chequeo;
