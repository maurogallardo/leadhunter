-- =====================================================================
-- LeadHunter - EJEMPLO: borrar la prueba de la cola
-- ---------------------------------------------------------------------
-- Esto NO es una migración: se corre a mano en el SQL Editor de Supabase.
--
-- Borra la zona de muestra (Córdoba, Córdoba, Argentina, sin barrio) y
-- TODOS sus pendientes de la cola (hechos, con error o sin hacer).
--
-- NO borra los leads que se hayan encontrado: esos quedan en la tabla
-- leads. NO borra las corridas.
--
-- ATENCIÓN: si más adelante cargás Córdoba capital como zona real,
-- este archivo también la borraría. Usalo solo para la prueba.
-- =====================================================================

begin;

delete from public.cola_busquedas
 where zona_id in (
   select id from public.zonas
    where pais = 'Argentina'
      and provincia = 'Córdoba'
      and localidad = 'Córdoba'
      and barrio is null
 );

delete from public.zonas
 where pais = 'Argentina'
   and provincia = 'Córdoba'
   and localidad = 'Córdoba'
   and barrio is null;

commit;
