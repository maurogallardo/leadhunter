-- =====================================================================
-- LeadHunter - Zonas de Córdoba, paso 1: RESUMEN (vista previa)
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. No muestra datos de negocios.
-- Cuenta cuántas zonas se cargarían a partir de la lista oficial
-- (public.localidades_oficiales, localidades censales de Córdoba).
-- Antes hay que haber corrido "Cargar localidades oficiales" en modo aplicar.
--
-- Devuelve UNA fila:
--   localidades_censales_cordoba  total en la lista oficial
--   excluidas_por_nombre_repetido localidades con nombre repetido en dos
--                                 departamentos (no se cargan: ambiguas)
--   ya_existen_como_zona          ya están en zonas (no se duplican)
--   nuevas_a_cargar               zonas nuevas (entran DESACTIVADAS)
--   nuevas_sin_poblacion          de las nuevas, sin población de municipio
--                                 (quedan al final del orden)
-- =====================================================================

with censales as (
  select
    lo.provincia,
    lo.nombre,
    lo.poblacion_municipio,
    count(*) over (partition by lo.nombre_normalizado) as repeticiones
  from public.localidades_oficiales lo
  where lo.tipo = 'localidad_censal'
    and lo.provincia_id = '14'
),
unicas as (
  select c.*,
    exists (
      select 1 from public.zonas z
      where z.pais = 'Argentina'
        and z.provincia = c.provincia
        and z.localidad = c.nombre
        and z.barrio is null
    ) as ya_existe
  from censales c
  where c.repeticiones = 1
)
select
  (select count(*) from censales)                                   as localidades_censales_cordoba,
  (select count(*) from censales where repeticiones > 1)            as excluidas_por_nombre_repetido,
  (select count(*) from unicas where ya_existe)                     as ya_existen_como_zona,
  (select count(*) from unicas where not ya_existe)                 as nuevas_a_cargar,
  (select count(*) from unicas where not ya_existe
                                 and poblacion_municipio is null)   as nuevas_sin_poblacion;
