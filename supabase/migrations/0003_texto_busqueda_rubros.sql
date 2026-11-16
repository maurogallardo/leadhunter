-- =====================================================================
-- LeadHunter - Migración 0003: texto de búsqueda por rubro
-- ---------------------------------------------------------------------
-- Agrega a public.rubros la columna "texto_busqueda": el texto con el que
-- se busca ese rubro en Google Maps (ej. "fiambrerías" en vez de
-- "Almacenes y fiambrerías").
--
-- Es OPCIONAL: si queda vacía (null), la cola usa el nombre del rubro.
-- No carga valores: los 7 rubros quedan con null (= se busca por nombre).
--
-- No toca permisos ni políticas: los permisos de la 0001 son sobre la
-- tabla entera, así que la columna nueva ya queda cubierta (authenticated
-- y service_role pueden usarla; anon sigue sin acceso).
--
-- IMPORTANTE: esta migración NO se edita una vez aplicada.
-- =====================================================================

begin;

alter table public.rubros
  add column texto_busqueda text;

comment on column public.rubros.texto_busqueda is
  'Texto con el que se busca el rubro en Google Maps. Si está vacío se usa el nombre.';

commit;
