// Capa fina que habla con Supabase. Sin lógica de negocio: solo consultas.
// Usa la clave secreta (service_role): saltea RLS. Esa clave vive SOLO en
// los Secrets de GitHub; nunca en el repo ni en el código.
// Ninguna función imprime nada: los errores se lanzan y el importador
// los convierte en códigos seguros.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Lead } from '../limpieza/tipos.js';
import { cajaAlrededor, COLUMNAS_LEAD, type EstadoCorrida, filaALead, telefonosDeLead } from './decision.js';
import { puntoDe } from '../limpieza/ubicacion.js';

const SELECCION_LEAD = COLUMNAS_LEAD.join(',');

/** Máximo de candidatos por consulta (alcanza de sobra para decidir). */
const LIMITE_CANDIDATOS = 50;

export function crearCliente(url: string, claveSecreta: string): SupabaseClient {
  return createClient(url, claveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** id del rubro si existe con ese nombre exacto y está activo; si no, null. */
export async function buscarRubroActivo(db: SupabaseClient, nombre: string): Promise<string | null> {
  const { data, error } = await db.from('rubros').select('id, activo').eq('nombre', nombre).maybeSingle();
  if (error) throw error;
  if (!data || data.activo !== true || typeof data.id !== 'string') return null;
  return data.id;
}

export async function crearCorrida(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.from('corridas').insert({ fuente: 'gosom', estado: 'en_curso' }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export interface CierreCorrida {
  estado: EstadoCorrida;
  leadsNuevos: number;
  bloqueoDetectado: boolean;
  detalle: string;
}

export async function cerrarCorrida(db: SupabaseClient, id: string, cierre: CierreCorrida): Promise<void> {
  const { error } = await db
    .from('corridas')
    .update({
      terminada_en: new Date().toISOString(),
      estado: cierre.estado,
      busquedas_hechas: 1,
      leads_nuevos: cierre.leadsNuevos,
      bloqueo_detectado: cierre.bloqueoDetectado,
      detalle: cierre.detalle,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Trae de la base los leads que podrían ser el mismo negocio:
 * mismo google_place_id, algún teléfono igual (en cualquiera de las 3
 * columnas de teléfono) o cercanos (caja de ±100 m). La decisión final
 * la toma sonMismoNegocio, no esta función.
 */
export async function buscarCandidatos(db: SupabaseClient, lead: Lead): Promise<Lead[]> {
  const porId = new Map<string, Lead>();
  const agregar = (filas: unknown[] | null): void => {
    for (const fila of filas ?? []) {
      const candidato = filaALead(fila as Record<string, unknown>);
      if (candidato.id) porId.set(candidato.id, candidato);
    }
  };

  const placeId = lead.google_place_id?.trim();
  if (placeId) {
    const { data, error } = await db.from('leads').select(SELECCION_LEAD).eq('google_place_id', placeId).limit(LIMITE_CANDIDATOS);
    if (error) throw error;
    agregar(data);
  }

  const telefonos = telefonosDeLead(lead);
  if (telefonos.length > 0) {
    for (const columna of ['celular', 'telefono_fijo', 'telefono_sin_clasificar'] as const) {
      const { data, error } = await db.from('leads').select(SELECCION_LEAD).in(columna, telefonos).limit(LIMITE_CANDIDATOS);
      if (error) throw error;
      agregar(data);
    }
  }

  const punto = puntoDe(lead);
  if (punto) {
    const caja = cajaAlrededor(punto.lat, punto.lng);
    const { data, error } = await db
      .from('leads')
      .select(SELECCION_LEAD)
      .gte('lat', caja.latMin)
      .lte('lat', caja.latMax)
      .gte('lng', caja.lngMin)
      .lte('lng', caja.lngMax)
      .limit(LIMITE_CANDIDATOS);
    if (error) throw error;
    agregar(data);
  }

  return [...porId.values()];
}

export async function insertarLead(db: SupabaseClient, fila: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('leads').insert(fila);
  if (error) throw error;
}

export async function actualizarLead(db: SupabaseClient, id: string, fila: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('leads').update(fila).eq('id', id);
  if (error) throw error;
}
