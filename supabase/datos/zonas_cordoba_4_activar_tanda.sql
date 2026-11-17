-- =====================================================================
-- LeadHunter - Zonas de Córdoba, paso 4: ACTIVAR UNA TANDA
-- ---------------------------------------------------------------------
-- Para correr a mano en el SQL Editor de Supabase, cuando decidas.
-- Activa las zonas de Córdoba con prioridad entre DESDE y HASTA.
-- Activar NO busca nada: después hay que correr "Armar cola" y
-- "Procesar cola" a mano.
--
-- ANTES de activar pueblos chicos, ver docs/DEUDA.md (tema "dos
-- búsquedas seguidas sin resultados"): con la regla actual, la cola
-- se frena seguido en localidades con pocos negocios.
--
-- CÓMO USARLO: cambiá los DOS números de la línea "between" (abajo).
-- Ejemplo de primera tanda: 2 y 11 (las 10 que siguen a Córdoba capital).
-- Para ver qué prioridad tiene cada localidad: paso 2.
--
-- Al final devuelve UNA fila con cuántas quedaron activas.
-- =====================================================================

begin;

update public.zonas
set activo = true
where pais = 'Argentina'
  and provincia = 'Córdoba'
  and barrio is null
  and activo = false
  and prioridad between 2 and 11;   -- <- CAMBIAR: DESDE y HASTA

commit;

select
  count(*) filter (where activo)     as activas,
  count(*) filter (where not activo) as desactivadas
from public.zonas
where pais = 'Argentina'
  and provincia = 'Córdoba';
