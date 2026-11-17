import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { aplicarCondiciones, condicionesDeFiltros, rangoDePagina, type Filtros } from './filtros';
import { COLUMNAS_LEAD, LEADS_POR_PAGINA, TANDA_EXPORTAR, filaALead, type LeadPanel, type Rubro, type Ubicacion } from './tipos';

// Lecturas de la base. Todas con la sesión de Mauro (RLS aplica).
// Los errores se informan con un mensaje corto, sin datos de negocios.

export class ErrorDeLectura extends Error {}

const falla = (que: string): ErrorDeLectura => new ErrorDeLectura(`No se pudo leer ${que}.`);

/** Consulta de leads con los filtros aplicados en la base, más nuevos primero. */
function consultaLeads(db: SupabaseClient, filtros: Filtros, contar: boolean) {
  const base = db.from('leads').select(COLUMNAS_LEAD, contar ? { count: 'exact' } : undefined);
  return aplicarCondiciones(base, condicionesDeFiltros(filtros))
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false });
}

export interface PaginaLeads {
  leads: LeadPanel[];
  total: number;
}

/** Una página de 100 leads (paginación hecha en la base). */
export async function leerPaginaLeads(db: SupabaseClient, filtros: Filtros): Promise<PaginaLeads> {
  const { desde, hasta } = rangoDePagina(filtros.pagina, LEADS_POR_PAGINA);
  const { data, error, count } = await consultaLeads(db, filtros, true).range(desde, hasta);
  if (error) throw falla('los leads');
  return { leads: (data ?? []).map((f) => filaALead(f as unknown as Record<string, unknown>)), total: count ?? 0 };
}

/**
 * Recorre TODOS los leads que coinciden con los filtros, en tandas de 1000,
 * y entrega cada tanda. Para exportar el CSV sin cargar todo junto.
 * Solo toma leads cargados hasta el momento en que empieza: si el scraper
 * agrega leads mientras tanto, no se corren las tandas (ni se repiten filas).
 */
export async function* recorrerLeads(db: SupabaseClient, filtros: Filtros): AsyncGenerator<LeadPanel[]> {
  const inicio = new Date().toISOString();
  for (let desde = 0; ; desde += TANDA_EXPORTAR) {
    const { data, error } = await consultaLeads(db, filtros, false)
      .lte('creado_en', inicio)
      .range(desde, desde + TANDA_EXPORTAR - 1);
    if (error) throw falla('los leads');
    const filas = data ?? [];
    if (filas.length > 0) yield filas.map((f) => filaALead(f as unknown as Record<string, unknown>));
    if (filas.length < TANDA_EXPORTAR) return;
  }
}

/** Rubros (para el desplegable), por nombre. */
export async function leerRubros(db: SupabaseClient): Promise<Rubro[]> {
  const { data, error } = await db.from('rubros').select('id, nombre').order('nombre');
  if (error) throw falla('los rubros');
  return (data ?? []).map((r) => ({ id: String(r.id), nombre: String(r.nombre) }));
}

/** Pares provincia/localidad que existen (vista leads_ubicaciones, migración 0004). */
export async function leerUbicaciones(db: SupabaseClient): Promise<Ubicacion[]> {
  const resultado: Ubicacion[] = [];
  for (let desde = 0; ; desde += TANDA_EXPORTAR) {
    const { data, error } = await db
      .from('leads_ubicaciones')
      .select('provincia, localidad')
      .order('provincia')
      .order('localidad')
      .range(desde, desde + TANDA_EXPORTAR - 1);
    if (error) throw falla('las provincias y localidades');
    const filas = data ?? [];
    for (const f of filas) {
      resultado.push({
        provincia: typeof f.provincia === 'string' ? f.provincia : null,
        localidad: typeof f.localidad === 'string' ? f.localidad : null,
      });
    }
    if (filas.length < TANDA_EXPORTAR) return resultado;
  }
}
