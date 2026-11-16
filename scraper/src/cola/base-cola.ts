// Capa fina que habla con Supabase para la cola. Sin lógica de negocio.
// Ninguna función imprime nada: los errores se lanzan.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FUENTE_COLA,
  filaAPendiente,
  filaARubro,
  filaAZona,
  MENSAJE_INTERRUMPIDA,
  type Par,
  type Pendiente,
  type Rubro,
  type Zona,
} from './reglas.js';

/** Supabase devuelve como máximo 1000 filas por consulta: se lee por páginas. */
const TAMANO_PAGINA = 1000;
const TAMANO_LOTE_INSERCION = 500;

type Pagina = PromiseLike<{ data: unknown[] | null; error: unknown }>;

async function leerTodo(pedirPagina: (desde: number, hasta: number) => Pagina): Promise<Record<string, unknown>[]> {
  const todas: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await pedirPagina(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    const filas = (data ?? []) as Record<string, unknown>[];
    todas.push(...filas);
    if (filas.length < TAMANO_PAGINA) return todas;
  }
}

const noNulos = <T>(lista: (T | null)[]): T[] => lista.filter((x): x is T => x !== null);

export async function leerRubros(db: SupabaseClient): Promise<Rubro[]> {
  const filas = await leerTodo((d, h) => db.from('rubros').select('id, nombre, texto_busqueda, activo, creado_en').order('id').range(d, h));
  return noNulos(filas.map(filaARubro));
}

export async function leerZonas(db: SupabaseClient): Promise<Zona[]> {
  const filas = await leerTodo((d, h) =>
    db.from('zonas').select('id, pais, provincia, localidad, barrio, prioridad, activo, creado_en').order('id').range(d, h),
  );
  return noNulos(filas.map(filaAZona));
}

/** Todas las combinaciones rubro × zona que ya están en la cola (cualquier estado). */
export async function leerParesExistentes(db: SupabaseClient): Promise<Par[]> {
  const filas = await leerTodo((d, h) =>
    db.from('cola_busquedas').select('rubro_id, zona_id').eq('fuente', FUENTE_COLA).order('id').range(d, h),
  );
  return filas.flatMap((f) =>
    typeof f['rubro_id'] === 'string' && typeof f['zona_id'] === 'string' ? [{ rubro_id: f['rubro_id'], zona_id: f['zona_id'] }] : [],
  );
}

/** Pendientes que podrían tomarse (estado pendiente o error; el filtro fino lo hace reglas.ts). */
export async function leerPendientesTomables(db: SupabaseClient): Promise<Pendiente[]> {
  const filas = await leerTodo((d, h) =>
    db
      .from('cola_busquedas')
      .select('id, rubro_id, zona_id, estado, intentos')
      .eq('fuente', FUENTE_COLA)
      .in('estado', ['pendiente', 'error'])
      .order('id')
      .range(d, h),
  );
  return noNulos(filas.map(filaAPendiente));
}

/**
 * Inserta pendientes nuevos. Si alguno ya existe (índice único rubro +
 * zona + fuente), se ignora. Devuelve cuántos se insertaron de verdad.
 */
export async function insertarPendientes(db: SupabaseClient, pares: readonly Par[]): Promise<number> {
  let insertados = 0;
  for (let i = 0; i < pares.length; i += TAMANO_LOTE_INSERCION) {
    const lote = pares.slice(i, i + TAMANO_LOTE_INSERCION).map((p) => ({ ...p, fuente: FUENTE_COLA, estado: 'pendiente' }));
    const { data, error } = await db
      .from('cola_busquedas')
      .upsert(lote, { onConflict: 'rubro_id,zona_id,fuente', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;
    insertados += data?.length ?? 0;
  }
  return insertados;
}

/**
 * Pendientes que quedaron "en_curso" de una corrida que se cortó (cancelada,
 * pasada de tiempo). Como solo corre una cola a la vez, al empezar no puede
 * haber ninguno en curso de verdad: se marcan como error (cuenta como un
 * intento, así no se traban para siempre). Devuelve cuántos.
 */
export async function marcarInterrumpidas(db: SupabaseClient, ahora: string): Promise<number> {
  const { data, error } = await db
    .from('cola_busquedas')
    .update({ estado: 'error', error_mensaje: MENSAJE_INTERRUMPIDA, terminada_en: ahora })
    .eq('fuente', FUENTE_COLA)
    .eq('estado', 'en_curso')
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Toma un pendiente solo si sigue igual que cuando se leyó (mismo estado y
 * mismos intentos). Devuelve false si cambió entretanto.
 */
export async function tomarPendiente(db: SupabaseClient, p: Pendiente, cambio: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await db
    .from('cola_busquedas')
    .update(cambio)
    .eq('id', p.id)
    .eq('estado', p.estado)
    .eq('intentos', p.intentos)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) === 1;
}

export async function actualizarPendiente(db: SupabaseClient, id: string, cambio: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('cola_busquedas').update(cambio).eq('id', id);
  if (error) throw error;
}
