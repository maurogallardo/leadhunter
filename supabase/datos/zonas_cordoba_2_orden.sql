-- =====================================================================
-- LeadHunter - Zonas de Córdoba, paso 2: ORDEN (vista previa)
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. Muestra solo datos públicos oficiales
-- (nombres de localidades y población), ningún dato de negocios.
--
-- Lista las localidades censales de Córdoba en el orden en que se
-- buscarían (prioridad 1 = primero):
--   1. por población del MUNICIPIO (Censo 2022, INDEC), de mayor a menor;
--   2. si empatan, primero la localidad que se llama igual que su
--      municipio (la cabecera);
--   3. después, alfabético.
-- Las que no tienen municipio (sin población) van al final.
-- Las de nombre repetido en dos departamentos no se cargan.
-- Este orden es EXACTAMENTE el que usa el paso 3.
-- =====================================================================

with censales as (
  select
    lo.provincia,
    lo.nombre,
    lo.municipio,
    lo.poblacion_municipio,
    count(*) over (partition by lo.nombre_normalizado) as repeticiones
  from public.localidades_oficiales lo
  where lo.tipo = 'localidad_censal'
    and lo.provincia_id = '14'
),
ordenadas as (
  select
    c.*,
    row_number() over (
      order by c.poblacion_municipio desc nulls last,
               (c.nombre = c.municipio) desc,
               c.nombre
    ) as prioridad
  from censales c
  where c.repeticiones = 1
)
select
  o.prioridad,
  o.nombre as localidad,
  o.municipio,
  o.poblacion_municipio,
  exists (
    select 1 from public.zonas z
    where z.pais = 'Argentina' and z.provincia = o.provincia and z.localidad = o.nombre and z.barrio is null
  ) as ya_existe_como_zona
from ordenadas o
order by o.prioridad;
