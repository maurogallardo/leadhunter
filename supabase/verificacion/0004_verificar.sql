-- =====================================================================
-- LeadHunter - Verificación de la migración 0004
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. No muestra datos de negocios.
-- Una sola consulta. Devuelve una fila:
--   vista_existe | security_invoker | logueado_puede_leer | anon_no_puede_leer | ok
-- =====================================================================

with v as (
  select
    exists (
      select 1 from pg_views
       where schemaname = 'public' and viewname = 'leads_ubicaciones'
    ) as vista_existe,
    coalesce((
      select 'security_invoker=true' = any (c.reloptions)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'leads_ubicaciones'
    ), false) as security_invoker
)
select
  v.vista_existe,
  v.security_invoker,
  v.vista_existe and has_table_privilege('authenticated', 'public.leads_ubicaciones', 'select') as logueado_puede_leer,
  v.vista_existe and not has_table_privilege('anon', 'public.leads_ubicaciones', 'select') as anon_no_puede_leer,
  v.vista_existe
    and v.security_invoker
    and has_table_privilege('authenticated', 'public.leads_ubicaciones', 'select')
    and not has_table_privilege('anon', 'public.leads_ubicaciones', 'select') as ok
from v;
