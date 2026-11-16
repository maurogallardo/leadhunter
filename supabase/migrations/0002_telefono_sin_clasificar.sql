-- =====================================================================
-- LeadHunter - Migración 0002: teléfono sin clasificar
-- ---------------------------------------------------------------------
-- Agrega a public.leads la columna "telefono_sin_clasificar": guarda un
-- teléfono válido (en formato +54...) cuando no se puede saber con
-- seguridad si es fijo o celular (ej. "351 555-0123", sin 0 ni 15).
--
-- No toca permisos ni políticas: los permisos de la 0001 son sobre la
-- tabla entera, así que la columna nueva ya queda cubierta (authenticated
-- y service_role pueden usarla; anon sigue sin acceso).
--
-- IMPORTANTE: esta migración NO se edita una vez aplicada.
-- =====================================================================

begin;

alter table public.leads
  add column telefono_sin_clasificar text;

comment on column public.leads.telefono_sin_clasificar is
  'Teléfono válido (+54...) que no se puede clasificar con seguridad como fijo o celular.';

commit;
