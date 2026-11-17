// Lectura y actualización de leads para "Reparar localidades", con la
// clave secreta del servidor. Sin lógica: solo consultas. No imprime nada.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Fuentes } from '../limpieza/tipos.js';
import type { LeadParaReparar } from './reparacion.js';

const TAMANO_PAGINA = 1000;

export async function leerLeadsParaReparar(db: SupabaseClient): Promise<LeadParaReparar[]> {
  const todos: LeadParaReparar[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await db
      .from('leads')
      .select('id, localidad, provincia, direccion, fuentes')
      .order('id')
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    const filas = (data ?? []) as Record<string, unknown>[];
    for (const f of filas) {
      if (typeof f['id'] !== 'string') continue;
      todos.push({
        id: f['id'],
        localidad: typeof f['localidad'] === 'string' ? f['localidad'] : null,
        provincia: typeof f['provincia'] === 'string' ? f['provincia'] : null,
        direccion: typeof f['direccion'] === 'string' ? f['direccion'] : null,
        fuentes: f['fuentes'],
      });
    }
    if (filas.length < TAMANO_PAGINA) return todos;
  }
}

/**
 * Cambia la localidad SOLO si sigue siendo la misma que se leyó (si alguien
 * la cambió mientras tanto, no la pisa). Devuelve true si actualizó.
 */
export async function actualizarLocalidad(
  db: SupabaseClient,
  id: string,
  anterior: string,
  nueva: string | null,
  fuentes: Fuentes,
): Promise<boolean> {
  const { data, error } = await db
    .from('leads')
    .update({ localidad: nueva, fuentes })
    .eq('id', id)
    .eq('localidad', anterior)
    .select('id');
  if (error) throw error;
  return (data ?? []).length === 1;
}
