-- =====================================================================
-- LeadHunter - Migración 0004: vista de provincias y localidades
-- ---------------------------------------------------------------------
-- Crea la vista public.leads_ubicaciones: cada par (provincia, localidad)
-- que existe en public.leads, una sola vez. La usa el panel para llenar
-- los desplegables de provincia y localidad sin bajar todos los leads.
--
-- SEGURIDAD:
-- - security_invoker = true: la vista se consulta con los permisos de
--   quien la usa, así que se aplican las reglas (RLS) de public.leads.
-- - Solo "authenticated" (Mauro logueado) puede leerla. anon no.
-- - Es de solo lectura: no cambia ni copia datos de leads.
--
-- IMPORTANTE: esta migración NO se edita una vez aplicada.
-- =====================================================================

begin;

create view public.leads_ubicaciones
  with (security_invoker = true)
as
select distinct
  l.provincia,
  l.localidad
from public.leads l
where l.provincia is not null
   or l.localidad is not null;

comment on view public.leads_ubicaciones is
  'Pares provincia/localidad que existen en leads (sin repetir). Para los filtros del panel.';

revoke all on table public.leads_ubicaciones from public, anon, authenticated, service_role;
grant select on table public.leads_ubicaciones to authenticated;

commit;
