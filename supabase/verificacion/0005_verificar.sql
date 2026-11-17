-- =====================================================================
-- LeadHunter - Verificación de la migración 0005
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. No muestra datos de negocios.
-- Una sola consulta. Devuelve UNA fila con true/false por cada chequeo
-- y una última columna "ok" que es true solo si todo está bien.
-- =====================================================================

with t as (
  select to_regclass('public.localidades_oficiales') as tabla
),
c as (
  select
    t.tabla is not null as tabla_existe,
    coalesce((select cl.relrowsecurity from pg_class cl where cl.oid = t.tabla), false) as rls_activo,
    case when t.tabla is null then false else
      has_table_privilege('authenticated', t.tabla, 'select')
    end as logueado_puede_leer,
    case when t.tabla is null then false else
      not has_table_privilege('authenticated', t.tabla, 'insert')
      and not has_table_privilege('authenticated', t.tabla, 'update')
      and not has_table_privilege('authenticated', t.tabla, 'delete')
    end as logueado_no_puede_escribir,
    case when t.tabla is null then false else
      not has_table_privilege('anon', t.tabla, 'select')
      and not has_table_privilege('anon', t.tabla, 'insert')
      and not has_table_privilege('anon', t.tabla, 'update')
      and not has_table_privilege('anon', t.tabla, 'delete')
    end as anon_sin_permisos,
    case when t.tabla is null then false else
      has_table_privilege('service_role', t.tabla, 'select')
      and has_table_privilege('service_role', t.tabla, 'insert')
      and has_table_privilege('service_role', t.tabla, 'update')
      and has_table_privilege('service_role', t.tabla, 'delete')
    end as servidor_puede_escribir,
    (
      select count(*) = 1
        and bool_and(p.cmd = 'SELECT' and p.roles = array['authenticated']::name[])
      from pg_policies p
      where p.schemaname = 'public' and p.tablename = 'localidades_oficiales'
    ) as solo_politica_de_lectura,
    exists (
      select 1 from pg_indexes i
      where i.schemaname = 'public'
        and i.tablename = 'localidades_oficiales'
        and i.indexname = 'localidades_oficiales_provincia_nombre_idx'
    ) as indice_existe
  from t
)
select
  c.*,
  coalesce(
    c.tabla_existe and c.rls_activo and c.logueado_puede_leer and c.logueado_no_puede_escribir
    and c.anon_sin_permisos and c.servidor_puede_escribir and c.solo_politica_de_lectura
    and c.indice_existe,
    false
  ) as ok
from c;
