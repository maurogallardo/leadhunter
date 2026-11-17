-- =====================================================================
-- LeadHunter - Zonas de Córdoba, paso 3: CARGAR
-- ---------------------------------------------------------------------
-- Esto NO es una migración: son DATOS, para correr a mano en el SQL
-- Editor de Supabase, después de mirar los pasos 1 y 2.
--
-- Carga una zona por cada localidad censal de Córdoba de la lista oficial
-- (public.localidades_oficiales), con:
--   - pais 'Argentina', provincia y nombre de la localidad tal como están
--     en la lista oficial;
--   - lat y lng del centro oficial de la localidad;
--   - prioridad según el orden del paso 2 (población del municipio);
--   - activo = FALSE: NINGUNA zona nueva se busca hasta activarla
--     (paso 4). Armar cola solo usa zonas activas.
--
-- No carga las localidades con nombre repetido en dos departamentos.
-- No duplica ni toca zonas que ya existen (ej. Córdoba capital).
-- Correrlo dos veces no repite nada.
-- No borra ni modifica datos existentes.
--
-- Al final devuelve UNA fila con el resultado.
-- =====================================================================

begin;

with censales as (
  select
    lo.provincia,
    lo.nombre,
    lo.municipio,
    lo.lat,
    lo.lng,
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
insert into public.zonas (pais, provincia, localidad, lat, lng, prioridad, activo)
select 'Argentina', o.provincia, o.nombre, o.lat, o.lng, o.prioridad, false
from ordenadas o
order by o.prioridad
on conflict do nothing;

commit;

select
  count(*)                                   as zonas_de_cordoba,
  count(*) filter (where activo)             as activas,
  count(*) filter (where not activo)         as desactivadas
from public.zonas
where pais = 'Argentina'
  and provincia = 'Córdoba';
