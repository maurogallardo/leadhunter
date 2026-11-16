-- =====================================================================
-- LeadHunter - EJEMPLO: cargar UNA zona de muestra
-- ---------------------------------------------------------------------
-- Esto NO es una migración: es un ejemplo para correr a mano en el
-- SQL Editor de Supabase, solo si querés probar la cola.
--
-- Carga la zona: Córdoba (localidad), provincia Córdoba, Argentina,
-- prioridad 1 (número más chico = se busca antes).
--
-- Para cargar otra zona, copiá el insert y cambiá los valores:
--   pais       -> 'Argentina'
--   provincia  -> nombre de la provincia
--   localidad  -> nombre de la ciudad o pueblo
--   prioridad  -> 1, 2, 3... (1 se busca primero)
-- No completes "barrio": hoy la cola busca por localidad.
--
-- Si la zona ya existe, no hace nada (no la duplica).
-- Para borrar esta prueba: supabase/ejemplos/borrar_prueba_cola.sql
-- =====================================================================

insert into public.zonas (pais, provincia, localidad, prioridad)
values ('Argentina', 'Córdoba', 'Córdoba', 1)
on conflict do nothing;
