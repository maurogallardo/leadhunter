-- =====================================================================
-- LeadHunter - Verificación de la migración 0003
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. No muestra datos de negocios.
-- Una sola consulta. Devuelve una fila:
--   chequeo | detalle | ok
-- =====================================================================

select
  'columna rubros.texto_busqueda' as chequeo,
  coalesce(
    (select 'existe, tipo: ' || c.data_type
       from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'rubros'
        and c.column_name = 'texto_busqueda'),
    'NO EXISTE'
  ) as detalle,
  exists (
    select 1
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = 'rubros'
       and c.column_name = 'texto_busqueda'
       and c.data_type = 'text'
  ) as ok;
