-- =====================================================================
-- LeadHunter - Verificación de la migración 0002
-- ---------------------------------------------------------------------
-- SOLO LECTURA: no cambia nada. No muestra datos de negocios.
-- Una sola consulta. Devuelve una fila:
--   chequeo | detalle | ok
-- =====================================================================

select
  'columna leads.telefono_sin_clasificar' as chequeo,
  coalesce(
    (select 'existe, tipo: ' || c.data_type
       from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'leads'
        and c.column_name = 'telefono_sin_clasificar'),
    'NO EXISTE'
  ) as detalle,
  exists (
    select 1
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = 'leads'
       and c.column_name = 'telefono_sin_clasificar'
       and c.data_type = 'text'
  ) as ok;
